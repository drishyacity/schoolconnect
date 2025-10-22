import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "lms-session-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production" ? true : false,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: 'lax'
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
    }, async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check role authorization
  const checkRole = (role: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== role && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Insufficient role permissions" });
      }

      next();
    };
  };

  // Authentication routes - only allow admins to register new users
  app.post("/api/register", async (req, res, next) => {
    try {
      // Verify the user is an administrator
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({
          message: "Access denied. Only administrators can create new user accounts."
        });
      }

      const userData = insertUserSchema.parse(req.body);

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email is already taken
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(userData.password);

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Don't send the password back to the client
      const { password, ...userWithoutPassword } = user;

      // Return the created user
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Registration error:", error);
        let errorMessage = "Server error during registration";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        res.status(500).json({ message: "Server error during registration", error: errorMessage });
      }
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Log login attempt
    console.log("Login attempt:", req.body.username);

    passport.authenticate("local", (err: Error, user: Express.User) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        console.warn("Login failed for user:", req.body.username);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session error during login:", err);
          return next(err);
        }

        console.log("Login successful for user:", user.username, "with role:", user.role);

        // Don't send the password back to the client
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Don't send the password back to the client
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Update current user profile
  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Don't allow changing critical fields
      delete req.body.role;
      delete req.body.password;
      delete req.body.username;

      const userData = { ...req.body };
      console.log("Updating current user profile with data:", userData);

      const updatedUser = await storage.updateUserProfile(req.user.id, userData);
      const { password, ...userWithoutPassword } = updatedUser;

      console.log("User profile updated successfully");
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // Middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Export authorization middleware
  app.locals.requireAuth = requireAuth;
  app.locals.requireAdmin = checkRole('admin');
  app.locals.requireTeacher = checkRole('teacher');
  app.locals.requireStudent = checkRole('student');
}
