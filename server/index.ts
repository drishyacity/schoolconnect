import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Global error:', err);

  // Ensure we always return JSON
  res.setHeader('Content-Type', 'application/json');

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    message
  });
});

// Import the necessary modules for resetting quiz attempts
import { quizAttempts } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { db } from './db';

// Function to reset quiz attempts for student with ID 9 (stu01)
async function resetQuizAttemptsForStu01() {
  try {
    console.log('Resetting quiz attempts for student stu01 (ID: 9)...');

    // Skip quiz reset for now to avoid startup issues
    console.log('Skipping quiz reset to ensure server starts properly...');
    return [];
  } catch (error) {
    console.error('Error resetting quiz attempts:', error);
    return [];
  }
}

(async () => {
  const server = await registerRoutes(app);

  // Serve static files and uploads
  app.use('/uploads', express.static(uploadsDir));

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Reset quiz attempts for stu01 before starting the server
  try {
    await resetQuizAttemptsForStu01();
  } catch (error) {
    console.log('Quiz reset failed, continuing server startup:', error);
  }

  // Listen on provided PORT (Render/Cloud) or default 5000
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, '0.0.0.0', () => {
    log(`Server running on port ${port}`);
  });
})();
