// Declare the global variable for student mobile numbers
declare global {
  var studentMobileNumbers: Map<number, string>;
}

import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage, type IStorage } from "./storage";
import { setupAuth } from "./auth";
import {
  insertSubjectSchema,
  insertClassSchema,
  insertClassSubjectSchema,
  insertContentSchema,
  insertQuizSchema,
  insertQuestionSchema,
  insertClassEnrollmentSchema,
  insertQuizAttemptSchema,
  insertStudentDocumentSchema,
  type User,
  type InsertUser,
  type Subject,
  type InsertSubject,
  type Class,
  type InsertClass,
  type ClassSubject,
  type InsertClassSubject,
  type ClassEnrollment,
  type InsertClassEnrollment,
  type Content,
  type InsertContent,
  type Quiz,
  type InsertQuiz,
  type Question,
  type InsertQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type TeacherQualification,
  type InsertTeacherQualification,
  type TeacherSubject,
  type InsertTeacherSubject,
  type StudentDocument,
  type InsertStudentDocument,
  type QuizWithQuestions,
  type ContentWithDetails,
  type ClassWithDetails,
  type ClassSubjectWithDetails,
  type TeacherWithDetails,
  type StudentWithDetails
} from "@shared/schema";
import { z } from "zod";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { checkConnection, pool, getDb, getSchema, db } from './db';
import { eq, and, desc } from 'drizzle-orm';
import { quizzes, questions, quizAttempts, contents } from '../shared/schema';

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Define allowed file types
const allowedFileTypes: Record<string, boolean> = {
  // Images
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  'image/svg+xml': true,
  // Documents
  'application/pdf': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'application/vnd.ms-powerpoint': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
  'text/plain': true,
  // Videos
  'video/mp4': true,
  'video/mpeg': true,
  'video/quicktime': true,
  'video/x-msvideo': true,
  'video/webm': true,
  // Audio
  'audio/mpeg': true,
  'audio/wav': true,
  'audio/ogg': true,
  'audio/webm': true
};

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (allowedFileTypes[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: images, documents, videos, and audio files.'));
    }
  }
});

// Helper functions for attendance and assignments
async function getStudentAttendancePercentage(studentId: number): Promise<number> {
  try {
    const client = await pool.connect();
    try {
      // Get attendance for current month
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const result = await client.query(`
        SELECT
          COUNT(*) as total_days,
          COUNT(CASE WHEN is_present = true THEN 1 END) as present_days
        FROM attendance
        WHERE student_id = $1
        AND date >= $2
        AND date <= $3
      `, [studentId, startOfMonth, endOfMonth]);

      const { total_days, present_days } = result.rows[0];
      return total_days > 0 ? Math.round((present_days / total_days) * 100) : 0;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting student attendance:', error);
    return 0;
  }
}

async function getStudentCompletedAssignments(studentId: number): Promise<number> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as completed_assignments
        FROM assignment_completions
        WHERE student_id = $1 AND is_completed = true
      `, [studentId]);

      return parseInt(result.rows[0].completed_assignments) || 0;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting student completed assignments:', error);
    return 0;
  }
}

async function getStudentTotalAssignments(studentId: number): Promise<number> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as total_assignments
        FROM assignment_completions
        WHERE student_id = $1
      `, [studentId]);

      return parseInt(result.rows[0].total_assignments) || 0;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting student total assignments:', error);
    return 0;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add JSON parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  // Add error handling middleware at the top level
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', err);

    // Ensure we always return JSON
    res.setHeader('Content-Type', 'application/json');

    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error"
    });
  });

  // Sets up auth routes and middleware
  setupAuth(app);

  // API routes
  // Subjects
  app.get("/api/subjects", async (req, res) => {
    try {
      console.log("Starting to fetch subjects...");

      // Check if we should include class counts
      const withClassCount = req.query.withClassCount === 'true';

      // First check database connection
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.error("Database connection failed");
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "Database connection failed. Please try again later."
        });
      }

      console.log("Database connection successful, fetching subjects...");

      // Get subjects with or without class counts based on the query parameter
      const subjects = withClassCount
        ? await storage.getSubjectsWithClassCount()
        : await storage.getAllSubjects();

      if (!subjects || subjects.length === 0) {
        console.log("No subjects found in database");
        return res.json([]);
      }

      console.log(`Successfully fetched ${subjects.length} subjects:`, subjects);
      return res.json(subjects);
    } catch (error) {
      console.error("Detailed error in /api/subjects:", error);
      return res.status(500).json({
        error: "Failed to fetch subjects",
        message: "An unexpected error occurred. Please try again later.",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/subjects", app.locals.requireAdmin, async (req, res) => {
    try {
      const subjectData = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(subjectData);
      res.status(201).json(subject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error creating subject" });
      }
    }
  });

  // Classes
  app.get("/api/classes", async (req, res) => {
    try {
      const classes = await storage.getAllClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching classes" });
    }
  });

  app.get("/api/classes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const classDetails = await storage.getClassWithDetails(id);
      if (!classDetails) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.json(classDetails);
    } catch (error) {
      res.status(500).json({ message: "Error fetching class details" });
    }
  });

  app.post("/api/classes", app.locals.requireAdmin, async (req, res) => {
    try {
      const classData = insertClassSchema.parse(req.body);
      const newClass = await storage.createClass(classData);
      res.status(201).json(newClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error creating class" });
      }
    }
  });

  app.patch("/api/classes/:id", app.locals.requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // We don't need to validate using insertClassSchema since this is a partial update
      const updatedClass = await storage.updateClass(id, req.body);
      res.status(200).json(updatedClass);
    } catch (error) {
      res.status(500).json({ message: "Error updating class" });
    }
  });

  // Class Subjects
  app.post("/api/class-subjects", app.locals.requireAdmin, async (req, res) => {
    try {
      const classSubjectData = insertClassSubjectSchema.parse(req.body);
      const classSubject = await storage.createClassSubject(classSubjectData);
      res.status(201).json(classSubject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error creating class subject" });
      }
    }
  });

  app.delete("/api/class-subjects/:id", app.locals.requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClassSubject(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting class subject" });
    }
  });

  // Enrollments
  app.post("/api/enrollments", app.locals.requireAdmin, async (req, res) => {
    try {
      const enrollmentData = insertClassEnrollmentSchema.parse(req.body);
      const enrollment = await storage.createEnrollment(enrollmentData);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error creating enrollment" });
      }
    }
  });

  app.get("/api/students/:studentId/classes", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const classes = await storage.getStudentClasses(studentId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching student classes" });
    }
  });

  app.get("/api/teachers/:teacherId/classes", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const classes = await storage.getTeacherClasses(teacherId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching teacher classes" });
    }
  });

  // Contents (Notes, Homework, DPPs, etc.)
  app.get("/api/contents", async (req, res) => {
    try {
      console.log("GET /api/contents - Query params:", req.query);

      // Parse query parameters
      const contentType = req.query.contentType as string | undefined;
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
      const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
      const authorId = req.query.authorId ? parseInt(req.query.authorId as string) : undefined;

      console.log(`Fetching contents with filters: contentType=${contentType}, classId=${classId}, subjectId=${subjectId}, authorId=${authorId}`);

      // For debugging, log authentication status
      console.log(`User authenticated: ${req.isAuthenticated()}`);
      if (req.isAuthenticated()) {
        console.log(`Authenticated user: ${req.user.id} (${req.user.role})`);
      }

      // Check database connection first
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.error("Database connection failed");
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "Database connection failed. Please try again later."
        });
      }

      // Directly query the database for contents
      try {
        // Use direct SQL query for better debugging
        const client = await pool.connect();
        try {
          let query = `
            SELECT
              c.*,
              u.id as author_id, u.name as author_name, u.email as author_email, u.role as author_role,
              cl.id as class_id, cl.name as class_name, cl.grade as class_grade, cl.section as class_section,
              s.id as subject_id, s.name as subject_name, s.description as subject_description
            FROM contents c
            LEFT JOIN users u ON c.author_id = u.id
            LEFT JOIN classes cl ON c.class_id = cl.id
            LEFT JOIN subjects s ON c.subject_id = s.id
            WHERE 1=1
          `;

          const params: any[] = [];
          let paramIndex = 1;

          if (contentType) {
            query += ` AND c.content_type = $${paramIndex++}`;
            params.push(contentType);
          }

          if (classId !== undefined) {
            query += ` AND c.class_id = $${paramIndex++}`;
            params.push(classId);
          }

          if (subjectId !== undefined) {
            query += ` AND c.subject_id = $${paramIndex++}`;
            params.push(subjectId);
          }

          if (authorId !== undefined) {
            query += ` AND c.author_id = $${paramIndex++}`;
            params.push(authorId);
          }

          console.log("Executing SQL query:", query);
          console.log("With parameters:", params);

          const result = await client.query(query, params);
          console.log(`Query returned ${result.rows.length} rows`);

          // Transform the results to match the expected format
          const contents = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            contentType: row.content_type,
            classId: row.class_id,
            subjectId: row.subject_id,
            authorId: row.author_id,
            fileUrl: row.file_url,
            status: row.status,
            createdAt: row.created_at,
            dueDate: row.due_date,
            author: {
              id: row.author_id,
              name: row.author_name,
              email: row.author_email,
              role: row.author_role
            },
            class: {
              id: row.class_id,
              name: row.class_name,
              grade: row.class_grade,
              section: row.class_section
            },
            subject: {
              id: row.subject_id,
              name: row.subject_name,
              description: row.subject_description
            }
          }));

          // Log a sample of the contents for debugging
          if (contents.length > 0) {
            console.log(`Sample content item:`, JSON.stringify(contents[0], null, 2));
          } else {
            console.log("No content items found matching the filters");
          }

          // Return the contents
          return res.json(contents);
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error("Database error fetching contents:", dbError);
        return res.status(500).json({ message: "Database error fetching contents" });
      }
    } catch (error) {
      console.error("Error fetching contents:", error);
      res.status(500).json({ message: "Error fetching contents" });
    }
  });

  // Helper function to create test content
  async function createTestContent() {
    try {
      // Get all users with role 'teacher'
      const users = await storage.getUsers();
      const teachers = users.filter(user => user.role === 'teacher');

      if (teachers.length === 0) {
        console.log('No teachers found. Cannot create test content.');
        return;
      }

      // Get all classes
      const allClasses = await storage.getAllClasses();
      if (allClasses.length === 0) {
        console.log('No classes found. Cannot create test content.');
        return;
      }

      // Get all subjects
      const allSubjects = await storage.getAllSubjects();
      if (allSubjects.length === 0) {
        console.log('No subjects found. Cannot create test content.');
        return;
      }

      // Create sample content for each teacher
      for (const teacher of teachers) {
        console.log(`Creating content for teacher: ${teacher.name} (ID: ${teacher.id})`);

        // Create a note
        const note = {
          title: `Physics Notes - ${teacher.name}`,
          description: 'Comprehensive notes on mechanics and thermodynamics',
          contentType: 'note' as const,
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/notes.pdf',
          status: 'active' as const,
        };

        // Create a homework
        const homework = {
          title: `Math Homework - ${teacher.name}`,
          description: 'Practice problems on calculus',
          contentType: 'homework' as const,
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/homework.pdf',
          status: 'active' as const,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        };

        // Create a DPP
        const dpp = {
          title: `Chemistry DPP - ${teacher.name}`,
          description: 'Daily practice problems on organic chemistry',
          contentType: 'dpp' as const,
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/dpp.pdf',
          status: 'active' as const,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
        };

        // Create a lecture
        const lecture = {
          title: `Biology Lecture - ${teacher.name}`,
          description: 'Video lecture on cell biology',
          contentType: 'lecture' as const,
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/lecture.mp4',
          status: 'active' as const,
        };

        // Create a sample paper
        const samplePaper = {
          title: `English Sample Paper - ${teacher.name}`,
          description: 'Sample paper for final exam',
          contentType: 'sample_paper' as const,
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/sample_paper.pdf',
          status: 'active' as const,
        };

        // Insert all content
        try {
          await storage.createContent(note);
          await storage.createContent(homework);
          await storage.createContent(dpp);
          await storage.createContent(lecture);
          await storage.createContent(samplePaper);
          console.log(`Created 5 content items for teacher ${teacher.name}`);
        } catch (error) {
          console.error('Error creating content:', error);
        }
      }
    } catch (error) {
      console.error('Error creating test content:', error);
    }
  }

  app.get("/api/contents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const content = await storage.getContent(id);

      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Get additional details to return with the content
      const author = await storage.getUser(content.authorId);
      const classData = content.classId ? await storage.getClass(content.classId) : null;
      const subject = content.subjectId ? await storage.getSubject(content.subjectId) : null;

      const contentWithDetails = {
        ...content,
        author: author ? { ...author, password: undefined } : null,
        class: classData,
        subject: subject
      };

      res.json(contentWithDetails);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Error fetching content details" });
    }
  });

  app.post("/api/contents", app.locals.requireTeacher, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log("Creating content with data:", req.body);

      const contentData = insertContentSchema.parse({
        ...req.body,
        authorId: req.user.id,
        status: req.body.status || "published"
      });

      console.log("Validated content data:", contentData);

      const content = await storage.createContent(contentData);
      console.log("Content created:", content);

      res.status(201).json(content);
    } catch (error) {
      console.error("Error creating content:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }

      res.status(500).json({ message: "Server error creating content" });
    }
  });

  app.patch("/api/contents/:id", app.locals.requireTeacher, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const id = parseInt(req.params.id);
      const content = await storage.getContent(id);

      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Allow all teachers to update any content, regardless of who created it
      if (req.user.role === "teacher" || req.user.role === "admin") {
        // Allow all changes for teachers and admins
        console.log(`${req.user.role} updating content`);
      }
      // For other roles, only the author can update
      else if (content.authorId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own content" });
      }

      // Log the original data
      console.log("Original update data:", JSON.stringify(req.body));

      // Create a clean update object without the dueDate field
      const updateData = { ...req.body };

      // Handle dueDate field specially
      if ('dueDate' in updateData) {
        const dueDate = updateData.dueDate;
        console.log("Due date from request:", dueDate);

        if (dueDate === null || dueDate === undefined || dueDate === "") {
          // If empty, explicitly set to null
          updateData.dueDate = null;
          console.log("Setting dueDate to null");
        } else {
          // Always try to parse the date string, regardless of format
          try {
            // For datetime-local input (YYYY-MM-DDTHH:MM)
            let parsedDate;
            if (typeof dueDate === 'string') {
              parsedDate = new Date(dueDate);
              if (!isNaN(parsedDate.getTime())) {
                updateData.dueDate = parsedDate;
                console.log("Parsed due date to:", parsedDate);
              } else {
                // If parsing fails, keep the original value
                console.log("Could not parse date, keeping original value:", dueDate);
              }
            } else if (dueDate instanceof Date) {
              // If it's already a Date object, use it directly
              updateData.dueDate = dueDate;
              console.log("Due date is already a Date object:", dueDate);
            }
          } catch (error) {
            console.error("Error parsing due date:", error);
            // Keep the original value if parsing fails
            console.log("Error parsing date, keeping original value:", dueDate);
          }
        }
      }

      console.log("Final update data:", JSON.stringify(updateData));

      // Use a simpler approach - just update the content directly
      // but handle the database operation manually
      let client;
      let updatedContent;

      try {
        client = await pool.connect();

        // Build a simple update query
        const keys = Object.keys(updateData);
        const values = Object.values(updateData);

        // If there are no fields to update, just return the current content
        if (keys.length === 0) {
          updatedContent = content;
        } else {
          // Build the SET clause
          const setClauses = keys.map((key, index) => {
            // Special handling for known column names
            let dbColumnName;
            if (key === 'class_id') {
              dbColumnName = 'class_id';
            } else if (key === 'subject_id') {
              dbColumnName = 'subject_id';
            } else if (key === 'classId') {
              dbColumnName = 'class_id';
            } else if (key === 'subjectId') {
              dbColumnName = 'subject_id';
            } else {
              // Convert camelCase to snake_case for SQL
              dbColumnName = key.replace(/([A-Z])/g, "_$1").toLowerCase();
            }

            console.log(`Converting field ${key} to database column ${dbColumnName}`);
            return `"${dbColumnName}" = $${index + 1}`;
          }).join(', ');

          // Add the ID parameter
          values.push(id);

          const query = `
            UPDATE contents
            SET ${setClauses}
            WHERE id = $${values.length}
            RETURNING *
          `;

          console.log("SQL Query:", query);
          console.log("SQL Values:", values);

          const result = await client.query(query, values);

          if (result.rows.length === 0) {
            throw new Error("Update failed, no rows returned");
          }

          updatedContent = result.rows[0];
        }
      } catch (error) {
        console.error("Database error:", error);
        throw error;
      } finally {
        if (client) {
          client.release();
        }
      }

      console.log("Content updated successfully:", updatedContent);
      res.status(200).json(updatedContent);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(500).json({
        message: "Error updating content",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/contents/:id", app.locals.requireTeacher, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const id = parseInt(req.params.id);
      const content = await storage.getContent(id);

      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Allow all teachers to delete any content, regardless of who created it
      if (req.user.role === "teacher" || req.user.role === "admin") {
        // Allow deletion for teachers and admins
        console.log(`${req.user.role} deleting content`);
      }
      // For other roles, only the author can delete
      else if (content.authorId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden: You can only delete your own content" });
      }

      await storage.deleteContent(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Error deleting content" });
    }
  });

  // Quizzes
  app.get("/api/quizzes", async (req, res) => {
    try {
      console.log("GET /api/quizzes - Query params:", req.query);

      // Allow filtering by class, subject, or author
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
      const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
      const authorId = req.query.authorId ? parseInt(req.query.authorId as string) : undefined;
      const role = req.query.role as string | undefined;

      // For teacher role, we'll fetch all quizzes (both teacher and admin created)
      if (role === 'teacher') {
        console.log("Teacher role detected - fetching all quizzes for classes and subjects");

        // Get all quizzes filtered only by class and subject, not by author
        const allQuizzes = await storage.getQuizzes(classId, subjectId, undefined);
        console.log(`Found ${allQuizzes.length} quizzes for teacher view`);

        // If requested, fetch additional details for each quiz
        const withDetails = req.query.withDetails === 'true';

        if (withDetails) {
          // Load additional details for each quiz
          const detailedQuizzes = await Promise.all(allQuizzes.map(async (quiz) => {
            const class_ = quiz.classId ? await storage.getClass(quiz.classId) : undefined;
            const subject = quiz.subjectId ? await storage.getSubject(quiz.subjectId) : undefined;
            const author = quiz.authorId ? await storage.getUser(quiz.authorId) : undefined;

            // Remove sensitive information from author
            const authorWithoutPassword = author ? {
              ...author,
              password: undefined
            } : undefined;

            return {
              ...quiz,
              class: class_,
              subject,
              author: authorWithoutPassword
            };
          }));

          return res.json(detailedQuizzes);
        } else {
          return res.json(allQuizzes);
        }
      }

      // Get basic quiz data
      let quizzes = await storage.getQuizzes(classId, subjectId, authorId);
      console.log(`Found ${quizzes.length} quizzes with standard filters`);

      // If requested, fetch additional details for each quiz
      const withDetails = req.query.withDetails === 'true';

      if (withDetails) {
        // Load additional details for each quiz
        const detailedQuizzes = await Promise.all(quizzes.map(async (quiz) => {
          const class_ = quiz.classId ? await storage.getClass(quiz.classId) : undefined;
          const subject = quiz.subjectId ? await storage.getSubject(quiz.subjectId) : undefined;
          const author = quiz.authorId ? await storage.getUser(quiz.authorId) : undefined;

          // Remove sensitive information from author
          const authorWithoutPassword = author ? {
            ...author,
            password: undefined
          } : undefined;

          return {
            ...quiz,
            class: class_,
            subject,
            author: authorWithoutPassword
          };
        }));

        res.json(detailedQuizzes);
      } else {
        res.json(quizzes);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ message: "Error fetching quizzes" });
    }
  });

  app.post("/api/quizzes", app.locals.requireTeacher, async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log("Raw request body:", JSON.stringify(req.body, null, 2));

      // First create the content entry
      const contentData = {
        title: req.body.title,
        description: req.body.description || null,
        classId: Number(req.body.classId),
        subjectId: Number(req.body.subjectId),
        authorId: req.user.id,
        status: req.body.status || 'published',
        contentType: 'quiz' as const,
        fileUrl: null,
        dueDate: null,
        createdAt: new Date()
      };

      console.log("Content data to be created:", JSON.stringify(contentData, null, 2));

      // Validate content data
      const contentValidation = insertContentSchema.safeParse(contentData);
      if (!contentValidation.success) {
        console.error("Content validation errors:", JSON.stringify(contentValidation.error.errors, null, 2));
        return res.status(400).json({
          message: "Validation error",
          errors: contentValidation.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      const content = await storage.createContent(contentData);
      console.log("Content created:", content);

      // Then create the quiz with the content ID
      const quizData = {
        contentId: content.id,
        timeLimit: Number(req.body.timeLimit),
        passingScore: Number(req.body.passingScore),
        totalPoints: req.body.totalPoints || 0
      };

      console.log("Quiz data to be created:", JSON.stringify(quizData, null, 2));

      // Validate quiz data
      const quizValidation = insertQuizSchema.safeParse(quizData);
      if (!quizValidation.success) {
        console.error("Quiz validation errors:", JSON.stringify(quizValidation.error.errors, null, 2));
        return res.status(400).json({
          message: "Validation error",
          errors: quizValidation.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      const quiz = await storage.createQuiz(quizData);
      console.log("Quiz created:", quiz);

      // Create the questions with order
      const questions = req.body.questions;
      if (Array.isArray(questions) && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const questionData = {
            quizId: quiz.id,
            text: questions[i].text,
            options: questions[i].options,
            points: Number(questions[i].points) || 1,
            order: i
          };

          console.log(`Question ${i + 1} data:`, JSON.stringify(questionData, null, 2));

          // Validate question data
          const questionValidation = insertQuestionSchema.safeParse(questionData);
          if (!questionValidation.success) {
            console.error(`Question ${i + 1} validation errors:`, JSON.stringify(questionValidation.error.errors, null, 2));
            return res.status(400).json({
              message: "Validation error",
              errors: questionValidation.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code
              }))
            });
          }

          await storage.createQuestion(questionData);
        }
      }

      // Return the complete quiz with questions
      const createdQuiz = await storage.getQuizWithQuestions(quiz.id);
      res.json(createdQuiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({
        message: "Failed to create quiz",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/quizzes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`GET /api/quizzes/${id} - Fetching quiz`);

      // Import the getQuizById function from quiz-handler.ts
      const { getQuizById } = await import('./quiz-handler');

      try {
        // Get the quiz using the dedicated function
        const quiz = await getQuizById(id);

        if (!quiz) {
          console.log(`Quiz with ID ${id} not found`);
          return res.status(404).json({ message: "Quiz not found" });
        }

        // Check if the quiz is deleted or not published for students
        if (req.user?.role === 'student' && quiz.status !== 'published' && quiz.status !== 'active') {
          console.log(`Quiz ${id} is not published for students`);
          return res.status(404).json({ message: "Quiz not available" });
        }

        console.log(`Successfully fetched quiz ${id} with ${quiz.questions.length} questions`);
        res.json(quiz);
      } catch (error) {
        console.error(`Error fetching quiz with ID ${id}:`, error);
        throw error;
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ message: "Error fetching quiz" });
    }
  });

  app.patch("/api/quizzes/:id", app.locals.requireTeacher, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const id = parseInt(req.params.id);
      console.log("Updating quiz with ID:", id);
      console.log("Update data:", req.body);

      // Get the quiz to check if it exists
      const quiz = await storage.getQuiz(id);
      console.log("Found quiz:", quiz);

      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      // Check if updateQuiz function exists
      console.log("Storage methods:", Object.keys(storage));

      // Update the quiz
      const updateData = {
        timeLimit: req.body.timeLimit !== undefined ? Number(req.body.timeLimit) : undefined,
        passingScore: req.body.passingScore !== undefined ? Number(req.body.passingScore) : undefined,
        totalPoints: req.body.totalPoints !== undefined ? Number(req.body.totalPoints) : undefined,
      };

      // Handle dueDate field specially
      if ('dueDate' in req.body) {
        const dueDate = req.body.dueDate;
        console.log("Due date from request:", dueDate);

        if (dueDate === null || dueDate === undefined || dueDate === "") {
          // If empty, explicitly set to null
          updateData.dueDate = null;
          console.log("Setting dueDate to null");
        } else {
          // Always try to parse the date string, regardless of format
          try {
            // For datetime-local input (YYYY-MM-DDTHH:MM)
            let parsedDate;
            if (typeof dueDate === 'string') {
              parsedDate = new Date(dueDate);
              if (!isNaN(parsedDate.getTime())) {
                updateData.dueDate = parsedDate;
                console.log("Parsed due date to:", parsedDate);
              } else {
                // If parsing fails, keep the original value
                console.log("Could not parse date, keeping original value:", dueDate);
              }
            } else if (dueDate instanceof Date) {
              // If it's already a Date object, use it directly
              updateData.dueDate = dueDate;
              console.log("Due date is already a Date object:", dueDate);
            }
          } catch (error) {
            console.error("Error parsing due date:", error);
            // Keep the original value if parsing fails
            console.log("Error parsing date, keeping original value:", dueDate);
          }
        }
      }

      console.log("Attempting to update quiz with data:", updateData);

      // Use direct SQL update as a workaround if updateQuiz is not available
      const db = await getDb();
      const { quizzes } = getSchema();

      const [updatedQuiz] = await db
        .update(quizzes)
        .set(updateData)
        .where(eq(quizzes.id, id))
        .returning();

      console.log("Quiz updated successfully via direct SQL:", updatedQuiz);

      // Update questions if provided
      if (req.body.questions && Array.isArray(req.body.questions)) {
        console.log("Updating quiz questions:", req.body.questions);

        // Get existing questions for this quiz
        const existingQuestions = await storage.getQuestions(id);
        console.log("Existing questions:", existingQuestions);

        // Update each question
        for (let i = 0; i < req.body.questions.length; i++) {
          const questionData = req.body.questions[i];
          const existingQuestion = existingQuestions[i];

          if (existingQuestion && questionData) {
            console.log(`Updating question ${i + 1}:`, questionData);

            // Process options to mark the correct one
            const options = questionData.options.map((opt: string, index: number) => ({
              text: opt,
              isCorrect: index.toString() === questionData.correctAnswer
            }));

            console.log("Processed options with correct answer marked:", options);

            // Update the question
            await storage.updateQuestion(existingQuestion.id, {
              text: questionData.text,
              options: options,
              points: Number(questionData.points) || 1
            });
          }
        }
      }

      console.log("Quiz updated successfully:", updatedQuiz);

      // Return the updated quiz with questions
      const updatedQuizWithQuestions = await storage.getQuizWithQuestions(id);

      // Log the updated quiz to check if due date is included
      console.log("Updated quiz with questions:", {
        ...updatedQuizWithQuestions,
        dueDate: updatedQuizWithQuestions.dueDate,
      });

      res.status(200).json(updatedQuizWithQuestions);
    } catch (error) {
      console.error("Error updating quiz:", error);
      res.status(500).json({
        message: "Error updating quiz",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/teachers/:teacherId/subjects", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const subjects = await storage.getTeacherSubjects(teacherId);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching teacher subjects:", error);
      res.status(500).json({ message: "Error fetching teacher subjects" });
    }
  });

  // Get quiz attempts for a student
  app.get("/api/students/:studentId/quiz-attempts", app.locals.requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      console.log(`GET /api/students/${studentId}/quiz-attempts - Fetching quiz attempts`);

      // Only allow students to view their own attempts or admins/teachers to view any student's attempts
      if (req.user.role === 'student' && req.user.id !== studentId) {
        console.log(`User ${req.user.id} (${req.user.role}) tried to access attempts for student ${studentId}`);
        return res.status(403).json({ message: "You can only view your own quiz attempts" });
      }

      // Get all quiz attempts for this student
      const attempts = await db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.studentId, studentId))
        .orderBy(desc(quizAttempts.startedAt));

      console.log(`Found ${attempts.length} quiz attempts for student ${studentId}`);

      // Return the attempts
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching student quiz attempts:", error);
      res.status(500).json({ message: "Error fetching student quiz attempts" });
    }
  });

  // Reset quiz attempts for a student (admin only)
  app.delete("/api/students/:studentId/quiz-attempts", app.locals.requireAdmin, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const { quizId } = req.query;

      console.log(`DELETE /api/students/${studentId}/quiz-attempts - Resetting quiz attempts`);
      console.log(`User ${req.user.id} (${req.user.role}) is resetting attempts for student ${studentId}`);

      let deleteQuery = db.delete(quizAttempts).where(eq(quizAttempts.studentId, studentId));

      // If a specific quiz ID is provided, only delete attempts for that quiz
      if (quizId) {
        const quizIdNum = parseInt(quizId as string);
        console.log(`Resetting attempts for quiz ${quizIdNum} only`);
        deleteQuery = deleteQuery.where(eq(quizAttempts.quizId, quizIdNum));
      }

      const result = await deleteQuery.returning();

      console.log(`Deleted ${result.length} quiz attempts for student ${studentId}`);

      res.json({
        message: `Successfully reset ${result.length} quiz attempts for student ${studentId}`,
        deletedAttempts: result
      });
    } catch (error) {
      console.error("Error resetting student quiz attempts:", error);
      res.status(500).json({ message: "Error resetting student quiz attempts" });
    }
  });

  // Quiz attempts
  app.post("/api/quiz-attempts", app.locals.requireStudent, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log("Creating quiz attempt with data:", req.body);

      // Get the quiz ID from the request body
      const quizId = req.body.quizId;
      if (!quizId) {
        return res.status(400).json({ message: "Quiz ID is required" });
      }

      // First, get the actual quiz ID from the content ID
      // This is necessary because the client sends the content ID, but we need the quiz ID
      let actualQuizId = parseInt(quizId);

      // Check if this is a content ID rather than a quiz ID
      const [quizFromContent] = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.contentId, parseInt(quizId)));

      if (quizFromContent) {
        console.log(`Found quiz with ID ${quizFromContent.id} for content ID ${quizId}`);
        actualQuizId = quizFromContent.id;
      } else {
        console.log(`No quiz found for content ID ${quizId}, assuming ${quizId} is already a quiz ID`);
      }

      console.log(`Using quiz ID ${actualQuizId} for attempt`);

      // Check if the student already has any attempts for this quiz
      const existingAttempts = await db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.studentId, req.user.id),
            eq(quizAttempts.quizId, actualQuizId)
          )
        );

      console.log(`Found ${existingAttempts.length} existing attempts for student ${req.user.id} and quiz ${actualQuizId}`);

      // Check if there's a completed attempt
      const completedAttempt = existingAttempts.find(attempt => attempt.completedAt !== null);
      if (completedAttempt) {
        console.log(`Student ${req.user.id} already has a completed attempt (${completedAttempt.id}) for quiz ${actualQuizId}`);
        return res.status(400).json({
          message: "You have already completed this quiz. You cannot attempt it again.",
          attemptId: completedAttempt.id
        });
      }

      // Check if there's an incomplete attempt
      const incompleteAttempt = existingAttempts.find(attempt => attempt.completedAt === null);
      if (incompleteAttempt) {
        console.log(`Student ${req.user.id} already has an incomplete attempt (${incompleteAttempt.id}) for quiz ${actualQuizId}`);
        console.log("Returning existing incomplete attempt instead of creating a new one");
        return res.status(200).json({
          ...incompleteAttempt,
          message: "Resuming existing quiz attempt"
        });
      }

      // Import the createQuizAttempt function from quiz-attempts.ts
      const { createQuizAttempt } = await import('./quiz-attempts');

      try {
        // Create the attempt using the dedicated function
        const attempt = await createQuizAttempt(req.user.id, parseInt(quizId));
        console.log("Quiz attempt created successfully:", attempt);
        res.status(201).json(attempt);
      } catch (attemptError) {
        console.error("Error creating quiz attempt:", attemptError);

        // If there's a foreign key constraint error, it means the quiz ID is invalid
        if (attemptError instanceof Error && attemptError.message.includes("foreign key constraint")) {
          return res.status(404).json({
            message: "Quiz not found or invalid",
            details: "There may be an issue with the quiz configuration. Please contact support."
          });
        }

        // If there's a specific error about content or quiz not found
        if (attemptError instanceof Error &&
            (attemptError.message.includes("No quiz found") ||
             attemptError.message.includes("No content found"))) {
          return res.status(404).json({
            message: "Quiz not found",
            details: attemptError.message
          });
        }

        throw attemptError; // Re-throw to be caught by the outer catch block
      }
    } catch (error) {
      console.error("Error in quiz attempt creation process:", error);

      res.status(500).json({
        message: "Server error creating quiz attempt",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get questions for a specific quiz
  app.get("/api/quizzes/:id/questions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`GET /api/quizzes/${id}/questions - Fetching questions`);

      // First, check if this is a quiz ID
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));

      if (!quiz) {
        // If not a quiz ID, check if it's a content ID
        const [content] = await db.select().from(contents).where(
          and(
            eq(contents.id, id),
            eq(contents.contentType, 'quiz' as any)
          )
        );

        if (!content) {
          return res.status(404).json({ message: "Quiz not found" });
        }

        // Get the quiz associated with this content
        const [quizFromContent] = await db.select().from(quizzes).where(eq(quizzes.contentId, content.id));

        if (!quizFromContent) {
          return res.status(404).json({ message: "Quiz details not found" });
        }

        // Get the questions for this quiz
        const questionsList = await db.select().from(questions).where(eq(questions.quizId, quizFromContent.id));

        // Process questions to ensure options are properly formatted
        const processedQuestions = questionsList.map(question => {
          // Make sure options is an array
          let options = question.options;

          // If options is a string, try to parse it as JSON
          if (typeof options === 'string') {
            try {
              options = JSON.parse(options);
            } catch (e) {
              options = [
                { id: 1, text: "Option A (Sample)", isCorrect: true },
                { id: 2, text: "Option B (Sample)", isCorrect: false },
                { id: 3, text: "Option C (Sample)", isCorrect: false },
                { id: 4, text: "Option D (Sample)", isCorrect: false }
              ];
            }
          }

          // Ensure each option has an id property
          options = options.map((opt, index) => ({
            id: opt.id || index + 1,
            text: opt.text || `Option ${index + 1}`,
            isCorrect: !!opt.isCorrect
          }));

          return {
            id: question.id,
            quizId: question.quizId || question.quiz_id,
            text: question.text,
            options: options,
            points: question.points,
            order: question.order
          };
        });

        console.log(`Found ${processedQuestions.length} questions for quiz content ID ${id}`);
        return res.json(processedQuestions);
      }

      // Get the questions for this quiz
      const questionsList = await db.select().from(questions).where(eq(questions.quizId, quiz.id));

      // Process questions to ensure options are properly formatted
      const processedQuestions = questionsList.map(question => {
        // Make sure options is an array
        let options = question.options;

        // If options is a string, try to parse it as JSON
        if (typeof options === 'string') {
          try {
            options = JSON.parse(options);
          } catch (e) {
            options = [
              { id: 1, text: "Option A (Sample)", isCorrect: true },
              { id: 2, text: "Option B (Sample)", isCorrect: false },
              { id: 3, text: "Option C (Sample)", isCorrect: false },
              { id: 4, text: "Option D (Sample)", isCorrect: false }
            ];
          }
        }

        // Ensure each option has an id property
        options = options.map((opt, index) => ({
          id: opt.id || index + 1,
          text: opt.text || `Option ${index + 1}`,
          isCorrect: !!opt.isCorrect
        }));

        return {
          id: question.id,
          quizId: question.quizId || question.quiz_id,
          text: question.text,
          options: options,
          points: question.points,
          order: question.order
        };
      });

      console.log(`Found ${processedQuestions.length} questions for quiz ID ${id}`);
      res.json(processedQuestions);
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      res.status(500).json({ message: "Error fetching quiz questions" });
    }
  });

  // Get quizzes with attempt status for a student
  app.get("/api/students/:studentId/quizzes-with-status", app.locals.requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      console.log(`GET /api/students/${studentId}/quizzes-with-status - Fetching quizzes with attempt status`);

      // Only allow students to view their own data or admins/teachers to view any student's data
      if (req.user.role === 'student' && req.user.id !== studentId) {
        console.log(`User ${req.user.id} (${req.user.role}) tried to access quiz status for student ${studentId}`);
        return res.status(403).json({ message: "You can only view your own quiz status" });
      }

      // Get all quiz attempts for this student
      const attempts = await db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.studentId, studentId));

      console.log(`Found ${attempts.length} quiz attempts for student ${studentId}`);

      // Get all quizzes
      const allQuizzes = await db
        .select()
        .from(quizzes);

      console.log(`Found ${allQuizzes.length} quizzes in total`);

      // Get all content items of type quiz
      const client = await pool.connect();
      try {
        const contentQuery = `
          SELECT
            c.*,
            u.id as author_id, u.name as author_name, u.email as author_email, u.role as author_role,
            cl.id as class_id, cl.name as class_name, cl.grade as class_grade, cl.section as class_section,
            s.id as subject_id, s.name as subject_name, s.description as subject_description
          FROM contents c
          LEFT JOIN users u ON c.author_id = u.id
          LEFT JOIN classes cl ON c.class_id = cl.id
          LEFT JOIN subjects s ON c.subject_id = s.id
          WHERE c.content_type = 'quiz'
        `;

        const contentResult = await client.query(contentQuery);
        console.log(`Found ${contentResult.rows.length} quiz content items`);

        // Transform the results to match the expected format
        const quizzesWithStatus = contentResult.rows.map(row => {
          // Find the quiz associated with this content
          const quiz = allQuizzes.find(q => q.contentId === row.id);

          if (quiz) {
            console.log(`Found quiz with ID ${quiz.id} for content ID ${row.id}`);
          } else {
            console.log(`No quiz found for content ID ${row.id}`);
          }

          // Find attempts for this quiz
          const quizAttempts = quiz
            ? attempts.filter(a => a.quizId === quiz.id)
            : [];

          // Determine attempt status
          let attemptStatus = "not_attempted";
          let attemptId = null;

          if (quizAttempts.length > 0) {
            // Check if any attempt is completed
            const completedAttempt = quizAttempts.find(a => a.completedAt !== null);
            if (completedAttempt) {
              attemptStatus = "completed";
              attemptId = completedAttempt.id;
            } else {
              attemptStatus = "in_progress";
              attemptId = quizAttempts[0].id;
            }
          }

          return {
            id: row.id,
            title: row.title,
            description: row.description,
            contentType: row.content_type,
            classId: row.class_id,
            subjectId: row.subject_id,
            authorId: row.author_id,
            fileUrl: row.file_url,
            status: row.status,
            createdAt: row.created_at,
            dueDate: row.due_date,
            author: {
              id: row.author_id,
              name: row.author_name,
              email: row.author_email,
              role: row.author_role
            },
            class: {
              id: row.class_id,
              name: row.class_name,
              grade: row.class_grade,
              section: row.class_section
            },
            subject: {
              id: row.subject_id,
              name: row.subject_name,
              description: row.subject_description
            },
            quizId: quiz ? quiz.id : null,
            attemptStatus,
            attemptId
          };
        });

        console.log(`Returning ${quizzesWithStatus.length} quizzes with status`);
        if (quizzesWithStatus.length > 0) {
          console.log("Sample quiz with status:", quizzesWithStatus[0]);
        }

        return res.json(quizzesWithStatus);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error fetching quizzes with status:", error);
      res.status(500).json({ message: "Error fetching quizzes with status" });
    }
  });

  // Get a specific quiz attempt with full details
  app.get("/api/quiz-attempts/:id", app.locals.requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`GET /api/quiz-attempts/${id} - Fetching quiz attempt with details`);

      // Get the quiz attempt
      const [attempt] = await db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.id, id));

      if (!attempt) {
        console.log(`Quiz attempt with ID ${id} not found`);
        return res.status(404).json({ message: "Quiz attempt not found" });
      }

      // Only allow students to view their own attempts or admins/teachers to view any attempt
      if (req.user.role === 'student' && req.user.id !== attempt.studentId) {
        console.log(`User ${req.user.id} (${req.user.role}) tried to access attempt ${id} belonging to student ${attempt.studentId}`);
        return res.status(403).json({ message: "You can only view your own quiz attempts" });
      }

      // Get the quiz details
      const [quiz] = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, attempt.quizId));

      if (!quiz) {
        console.log(`Quiz with ID ${attempt.quizId} not found`);
        return res.status(404).json({ message: "Quiz not found" });
      }

      // Get the content details
      const [content] = await db
        .select()
        .from(contents)
        .where(eq(contents.id, quiz.contentId));

      if (!content) {
        console.log(`Content with ID ${quiz.contentId} not found`);
        return res.status(404).json({ message: "Quiz content not found" });
      }

      // Get the questions for this quiz
      const questionsList = await db
        .select()
        .from(questions)
        .where(eq(questions.quizId, quiz.id));

      console.log(`Found ${questionsList.length} questions for quiz ${quiz.id}`);

      // Process questions to ensure options are properly formatted
      const processedQuestions = questionsList.map(question => {
        // Make sure options is an array
        let options = question.options;

        // If options is a string, try to parse it as JSON
        if (typeof options === 'string') {
          try {
            options = JSON.parse(options);
          } catch (e) {
            console.error(`Failed to parse options for question ${question.id}:`, e);
            options = [];
          }
        }

        // Ensure each option has an id property and normalize isCorrect to boolean
        options = Array.isArray(options) ? options.map((opt, index) => {
          // Normalize isCorrect to boolean
          let isCorrectValue = false;

          // Handle different formats of isCorrect
          if (opt.isCorrect === true || opt.isCorrect === 'true' || opt.isCorrect === 1 || opt.isCorrect === '1') {
            isCorrectValue = true;
          }

          // Also check for is_correct (snake_case)
          if (opt.is_correct === true || opt.is_correct === 'true' || opt.is_correct === 1 || opt.is_correct === '1') {
            isCorrectValue = true;
          }

          return {
            id: opt.id || index + 1,
            text: opt.text || `Option ${index + 1}`,
            isCorrect: isCorrectValue
          };
        }) : [];

        return {
          id: question.id,
          quizId: question.quizId || question.quiz_id,
          text: question.text,
          options: options,
          points: question.points,
          order: question.order
        };
      });

      // Calculate total score and percentage
      const score = attempt.score || 0;
      const totalPossibleScore = quiz.totalPoints || processedQuestions.reduce((total, q) => total + q.points, 0);
      const percentage = totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0;

      // Return the attempt with quiz, content, and questions details
      const fullAttemptDetails = {
        id: attempt.id,
        quizId: attempt.quizId,
        studentId: attempt.studentId,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        score: score,
        answers: attempt.answers,
        quiz: {
          id: quiz.id,
          contentId: content.id,
          title: content.title,
          description: content.description,
          timeLimit: quiz.timeLimit,
          passingScore: quiz.passingScore,
          totalPoints: totalPossibleScore,
          status: content.status,
          createdAt: content.createdAt,
          questions: processedQuestions
        },
        totalPossibleScore,
        percentage
      };

      console.log(`Successfully fetched quiz attempt ${id} with ${processedQuestions.length} questions`);
      res.json(fullAttemptDetails);
    } catch (error) {
      console.error("Error fetching quiz attempt:", error);
      res.status(500).json({ message: "Error fetching quiz attempt" });
    }
  });

  // Save quiz progress without completing
  app.patch("/api/quiz-attempts/:id/save-progress", app.locals.requireStudent, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attemptData = req.body;

      console.log(`Saving progress for quiz attempt ${id} with data:`, attemptData);
      console.log(`Auto-submit flag: ${attemptData.autoSubmit}`);

      // Import the necessary functions from quiz-attempts.ts
      const { saveQuizProgress, updateQuizAttempt } = await import('./quiz-attempts');

      try {
        if (attemptData.autoSubmit) {
          // If auto-submit is true, save progress and then complete the quiz
          console.log(`Auto-submitting quiz attempt ${id}`);

          // First save the progress
          await saveQuizProgress(id, req.user.id, attemptData.answers);

          // Then complete the quiz
          const updatedAttempt = await updateQuizAttempt(id, req.user.id, attemptData.answers);
          console.log(`Quiz attempt ${id} auto-submitted successfully with score: ${updatedAttempt.score}/${updatedAttempt.totalPossibleScore}`);

          res.json({
            message: "Quiz auto-submitted successfully",
            ...updatedAttempt
          });
        } else {
          // Just save the progress without completing
          const updatedAttempt = await saveQuizProgress(id, req.user.id, attemptData.answers);
          console.log(`Quiz attempt ${id} progress saved successfully`);
          res.json({
            message: "Progress saved successfully",
            attempt: updatedAttempt
          });
        }
      } catch (saveError) {
        console.error("Error saving quiz progress:", saveError);

        if (saveError instanceof Error && saveError.message.includes("not found")) {
          return res.status(404).json({ message: "Quiz attempt not found" });
        }

        throw saveError; // Re-throw to be caught by the outer catch block
      }
    } catch (error) {
      console.error("Error in quiz progress save process:", error);
      res.status(500).json({
        message: "Error saving quiz progress",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/quiz-attempts/:id", app.locals.requireStudent, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attemptData = req.body;

      console.log(`Updating quiz attempt ${id} with data:`, attemptData);
      console.log(`User ID: ${req.user.id}, User role: ${req.user.role}`);

      // Import the updateQuizAttempt function from quiz-attempts.ts
      const { updateQuizAttempt } = await import('./quiz-attempts');

      try {
        // Update the attempt using the dedicated function
        const updatedAttempt = await updateQuizAttempt(id, req.user.id, attemptData.answers);
        console.log(`Quiz attempt ${id} updated successfully with score: ${updatedAttempt.score}/${updatedAttempt.totalPossibleScore}`);

        // Return the updated attempt with additional information
        res.json({
          ...updatedAttempt,
          message: "Quiz submitted successfully",
          score: updatedAttempt.score,
          totalPossibleScore: updatedAttempt.totalPossibleScore,
          percentage: updatedAttempt.percentage
        });
      } catch (updateError) {
        console.error("Error updating quiz attempt:", updateError);

        if (updateError instanceof Error && updateError.message.includes("not found")) {
          return res.status(404).json({ message: "Quiz attempt not found" });
        }

        throw updateError; // Re-throw to be caught by the outer catch block
      }
    } catch (error) {
      console.error("Error in quiz attempt update process:", error);
      res.status(500).json({
        message: "Error updating quiz attempt",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Users
  app.get("/api/users", app.locals.requireAdmin, async (req, res) => {
    try {
      const role = req.query.role as string | undefined;
      const users = await storage.getUsers(role);

      // Remove passwords from the response
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Delete user
  app.delete("/api/users/:userId", app.locals.requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Don't allow deleting yourself
      if (req.user.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  // User profile - get
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`GET /api/users/${userId} - Fetching user profile`);

      // For debugging, log authentication status
      console.log(`User authenticated: ${req.isAuthenticated()}`);
      if (req.isAuthenticated()) {
        console.log(`Authenticated user: ${req.user.id} (${req.user.role})`);
      }

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins can view any profile, others can only view their own
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only view your own profile" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`User with ID ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`Found user: ${user.id} (${user.role})`);

      // Return appropriate details based on role
      if (user.role === 'teacher') {
        console.log(`Fetching teacher details for user ${userId}`);
        const teacherDetails = await storage.getTeacherWithDetails(userId);
        console.log(`Teacher details fetched:`, teacherDetails ? 'success' : 'failed');

        if (teacherDetails) {
          const { password, ...teacherWithoutPassword } = teacherDetails;
          console.log(`Returning teacher details for ${userId}`);
          return res.json(teacherWithoutPassword);
        } else {
          console.log(`No teacher details found, returning basic user info`);
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        }
      } else if (user.role === 'student') {
        console.log(`Fetching student details for user ${userId}`);
        const studentDetails = await storage.getStudentWithDetails(userId);
        console.log(`Student details fetched:`, studentDetails ? 'success' : 'failed');

        if (studentDetails) {
          const { password, ...studentWithoutPassword } = studentDetails;
          console.log(`Returning student details for ${userId}`);
          return res.json(studentWithoutPassword);
        } else {
          console.log(`No student details found, returning basic user info`);
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        }
      } else {
        // Admin or unknown role
        console.log(`Returning basic user info for ${userId} (${user.role})`);
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Error fetching user profile" });
    }
  });

  // User profile - update
  app.patch("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Important: Log authentication status and user session data
      console.log("Update user profile - Auth status:", req.isAuthenticated());
      console.log("Update user profile - User data:", req.user);

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins can update any profile, others can only update their own
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }

      // Log the data being updated
      console.log("Updating user profile with data:", req.body);

      // Don't allow changing critical fields like role unless admin
      if (req.user.role !== 'admin') {
        delete req.body.role;
      }

      // Don't allow changing password through this endpoint
      delete req.body.password;

      // We'll let the storage layer handle the date conversion now
      const userData = { ...req.body };
      console.log("Original request body:", userData);

      // Now that we have a proper mobileNumber column, we can just pass it through
      // without special handling
      const updatedUser = await storage.updateUserProfile(userId, userData);
      const { password, ...userWithoutPassword } = updatedUser;

      console.log("User profile updated successfully");
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // Reset password (admin only)
  app.post("/api/users/:userId/reset-password", app.locals.requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const defaultPassword = "password123"; // This would be randomly generated in production

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // In real implementation, hash the password
      await storage.updateUserProfile(userId, {
        password: defaultPassword
      });

      res.status(200).json({ message: "Password has been reset" });
    } catch (error) {
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  // Teacher details endpoint
  app.get("/api/users/:userId/teacher-details", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`GET /api/users/${userId}/teacher-details - Fetching teacher details`);

      // For debugging, log authentication status
      console.log(`User authenticated: ${req.isAuthenticated()}`);
      if (req.isAuthenticated()) {
        console.log(`Authenticated user: ${req.user.id} (${req.user.role})`);
      }

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the teacher themselves can view details
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only view your own details" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`User with ID ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== 'teacher') {
        console.log(`User ${userId} is not a teacher`);
        return res.status(400).json({ message: "User is not a teacher" });
      }

      console.log(`Fetching teacher details for user ${userId}`);
      const teacherDetails = await storage.getTeacherWithDetails(userId);

      if (!teacherDetails) {
        console.log(`No teacher details found for user ${userId}`);
        return res.status(404).json({ message: "Teacher details not found" });
      }

      console.log(`Teacher details fetched successfully for user ${userId}`);
      const { password, ...teacherWithoutPassword } = teacherDetails;
      return res.json(teacherWithoutPassword);
    } catch (error) {
      console.error("Error fetching teacher details:", error);
      res.status(500).json({ message: "Error fetching teacher details" });
    }
  });

  // Teacher qualifications
  app.get("/api/teachers/:teacherId/qualifications", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      console.log(`GET /api/teachers/${teacherId}/qualifications - Fetching qualifications`);

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the teacher themselves can view qualifications
      if (req.user.role !== 'admin' && req.user.id !== teacherId) {
        return res.status(403).json({ message: "Forbidden: You can only view your own qualifications" });
      }

      const qualifications = await storage.getTeacherQualifications(teacherId);
      console.log(`Found ${qualifications.length} qualifications for teacher ${teacherId}`);
      res.json(qualifications);
    } catch (error) {
      console.error("Error fetching teacher qualifications:", error);
      res.status(500).json({ message: "Error fetching teacher qualifications" });
    }
  });

  app.post("/api/teachers/:teacherId/qualifications", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the teacher themselves can add qualifications
      if (req.user.role !== 'admin' && req.user.id !== teacherId) {
        return res.status(403).json({ message: "Forbidden: You can only add your own qualifications" });
      }

      const qualificationData = {
        teacherId,
        qualification: req.body.qualification,
        institution: req.body.institution,
        year: req.body.year ? parseInt(req.body.year) : null
      };

      const qualification = await storage.createTeacherQualification(qualificationData);
      res.status(201).json(qualification);
    } catch (error) {
      res.status(500).json({ message: "Error adding teacher qualification" });
    }
  });

  app.delete("/api/teachers/qualifications/:id", async (req, res) => {
    try {
      const qualificationId = parseInt(req.params.id);

      // Get the qualification first to check ownership
      const qualification = await storage.getTeacherQualification(qualificationId);
      if (!qualification) {
        return res.status(404).json({ message: "Qualification not found" });
      }

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the teacher themselves can delete qualifications
      if (req.user.role !== 'admin' && req.user.id !== qualification.teacherId) {
        return res.status(403).json({ message: "Forbidden: You can only delete your own qualifications" });
      }

      await storage.deleteTeacherQualification(qualificationId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting teacher qualification" });
    }
  });

  // Teacher subjects (maximum 3)
  app.get("/api/teachers/:teacherId/subjects", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);

      const subjects = await storage.getTeacherSubjects(teacherId);
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Error fetching teacher subjects" });
    }
  });

  app.post("/api/teachers/:teacherId/subjects", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the teacher themselves can add subjects
      if (req.user.role !== 'admin' && req.user.id !== teacherId) {
        return res.status(403).json({ message: "Forbidden: You can only add subjects to your own profile" });
      }

      // Check if teacher already has 3 subjects
      const subjectCount = await storage.countTeacherSubjects(teacherId);
      if (subjectCount >= 3) {
        return res.status(400).json({ message: "Teachers can only teach a maximum of 3 subjects" });
      }

      const subjectData = {
        teacherId,
        subjectId: parseInt(req.body.subjectId)
      };

      const subject = await storage.createTeacherSubject(subjectData);
      res.status(201).json(subject);
    } catch (error) {
      res.status(500).json({ message: "Error adding teacher subject" });
    }
  });

  app.delete("/api/teachers/subjects/:id", async (req, res) => {
    try {
      const subjectId = parseInt(req.params.id);

      // Get the subject first to check ownership
      const subject = await storage.getTeacherSubject(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Teacher-subject association not found" });
      }

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the teacher themselves can delete subjects
      if (req.user.role !== 'admin' && req.user.id !== subject.teacherId) {
        return res.status(403).json({ message: "Forbidden: You can only remove subjects from your own profile" });
      }

      await storage.deleteTeacherSubject(subjectId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error removing teacher subject" });
    }
  });

  // Student class assignment
  app.post("/api/students/:studentId/enroll", app.locals.requireAdmin, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const classId = parseInt(req.body.classId);

      // Verify student exists and is actually a student
      const student = await storage.getUser(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      if (student.role !== 'student') {
        return res.status(400).json({ message: "User is not a student" });
      }

      // Verify class exists
      const classObj = await storage.getClass(classId);
      if (!classObj) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Create enrollment
      const enrollment = await storage.assignStudentToClass(studentId, classId);

      // Update student's grade and section based on the class
      await storage.updateUserProfile(studentId, {
        grade: classObj.grade,
        section: classObj.section
      });

      res.status(201).json(enrollment);
    } catch (error) {
      res.status(500).json({ message: "Error enrolling student" });
    }
  });

  // Dashboard data
  app.get("/api/dashboard/admin", app.locals.requireAdmin, async (req, res) => {
    try {
      const totalStudents = await storage.countUsers('student');
      const totalTeachers = await storage.countUsers('teacher');
      const totalClasses = await storage.countClasses();
      const totalQuizzes = await storage.countQuizzes();
      const recentUsers = await storage.getRecentUsers(5);
      const recentActivities = await storage.getRecentActivities(4);

      res.json({
        totalStudents,
        totalTeachers,
        totalClasses,
        totalQuizzes,
        recentUsers: recentUsers.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }),
        recentActivities
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });

  app.get("/api/dashboard/teacher", app.locals.requireTeacher, async (req, res) => {
    console.log("GET /api/dashboard/teacher - Fetching teacher dashboard data");

    // For debugging, log authentication status
    console.log(`User authenticated: ${req.isAuthenticated()}`);
    if (req.isAuthenticated()) {
      console.log(`Authenticated user: ${req.user.id} (${req.user.role})`);
    }

    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const teacherId = req.user.id;
      console.log(`Fetching dashboard data for teacher ${teacherId}`);

      console.log("Fetching teacher classes");
      const classes = await storage.getTeacherClasses(teacherId);
      console.log(`Found ${classes.length} classes for teacher ${teacherId}`);

      console.log("Counting teacher students");
      const totalStudents = await storage.countTeacherStudents(teacherId);
      console.log(`Found ${totalStudents} students for teacher ${teacherId}`);

      console.log("Counting pending grading");
      const pendingGrading = await storage.countPendingGrading(teacherId);
      console.log(`Found ${pendingGrading} pending gradings for teacher ${teacherId}`);

      console.log("Counting content uploads");
      // Get all content for the teacher's classes, not just created by the teacher
      const contentUploads = await storage.countTeacherClassesContents(teacherId);
      console.log(`Found ${contentUploads} content uploads for teacher ${teacherId}`);

      console.log("Fetching upcoming deadlines");
      const upcomingDeadlines = await storage.getTeacherUpcomingDeadlines(teacherId, 4);
      console.log(`Found ${upcomingDeadlines.length} upcoming deadlines for teacher ${teacherId}`);

      const responseData = {
        classes,
        totalStudents,
        pendingGrading,
        contentUploads,
        upcomingDeadlines
      };

      console.log("Sending teacher dashboard data:", JSON.stringify(responseData, null, 2));
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching teacher dashboard data:", error);
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });

  app.get("/api/dashboard/student", app.locals.requireStudent, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const studentId = req.user.id;
      console.log(`Fetching dashboard data for student ${studentId}`);

      // Get quiz data
      const completedQuizzes = await storage.countStudentCompletedQuizzes(studentId);
      const totalQuizzes = await storage.countStudentTotalQuizzes(studentId);

      // Get attendance data
      const attendancePercentage = await getStudentAttendancePercentage(studentId);

      // Get assignment data
      const completedAssignments = await getStudentCompletedAssignments(studentId);
      const totalAssignments = await getStudentTotalAssignments(studentId);

      // Add sample performance data for the student performance page
      const sampleSubjectPerformance = [
        {
          id: 1,
          name: "Mathematics",
          score: 85,
          grade: "A",
          teacher: "Mr. Johnson"
        },
        {
          id: 2,
          name: "Science",
          score: 78,
          grade: "B+",
          teacher: "Mrs. Smith"
        },
        {
          id: 3,
          name: "English",
          score: 92,
          grade: "A+",
          teacher: "Ms. Davis"
        },
        {
          id: 4,
          name: "History",
          score: 65,
          grade: "C",
          teacher: "Mr. Wilson"
        }
      ];

      const sampleQuizPerformance = [
        {
          id: 1,
          title: "Algebra Quiz",
          subject: "Mathematics",
          score: 80,
          date: "2025-05-01T10:00:00Z"
        },
        {
          id: 2,
          title: "Chemistry Test",
          subject: "Science",
          score: 75,
          date: "2025-05-03T14:30:00Z"
        },
        {
          id: 3,
          title: "Grammar Quiz",
          subject: "English",
          score: 95,
          date: "2025-05-05T09:15:00Z"
        }
      ];

      const sampleAssignmentPerformance = [
        {
          id: 1,
          title: "Math Homework",
          subject: "Mathematics",
          score: 90,
          date: "2025-04-28T23:59:00Z"
        },
        {
          id: 2,
          title: "Science Lab Report",
          subject: "Science",
          score: 82,
          date: "2025-05-02T23:59:00Z"
        },
        {
          id: 3,
          title: "Book Report",
          subject: "English",
          score: 88,
          date: "2025-05-04T23:59:00Z"
        }
      ];

      const sampleRecentPerformance = [
        {
          id: 1,
          type: "quiz",
          title: "Algebra Quiz",
          subject: "Mathematics",
          score: 80,
          date: "2025-05-01T10:00:00Z"
        },
        {
          id: 2,
          type: "assignment",
          title: "Science Lab Report",
          subject: "Science",
          score: 82,
          date: "2025-05-02T23:59:00Z"
        },
        {
          id: 3,
          type: "exam",
          title: "Mid-term Exam",
          subject: "English",
          score: 90,
          date: "2025-04-25T09:00:00Z"
        },
        {
          id: 4,
          type: "quiz",
          title: "Grammar Quiz",
          subject: "English",
          score: 95,
          date: "2025-05-05T09:15:00Z"
        }
      ];

      res.json({
        completedQuizzes,
        totalQuizzes,
        attendancePercentage,
        completedAssignments,
        totalAssignments,
        // Add sample performance data for performance page
        subjectPerformance: sampleSubjectPerformance,
        quizPerformance: sampleQuizPerformance,
        assignmentPerformance: sampleAssignmentPerformance,
        recentPerformance: sampleRecentPerformance
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });

  // Student document operations
  app.get("/api/students/:studentId/documents", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins, teachers or the student themselves can view documents
      const isAdmin = req.user.role === 'admin';
      const isTeacher = req.user.role === 'teacher';
      const isSelf = req.user.id === studentId;

      if (!isAdmin && !isTeacher && !isSelf) {
        return res.status(403).json({ message: "Forbidden: You don't have access to these documents" });
      }

      const documents = await storage.getStudentDocuments(studentId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching student documents:", error);
      res.status(500).json({ message: "Error fetching student documents" });
    }
  });

  app.get("/api/student-documents/:documentId", async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const document = await storage.getStudentDocument(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins, teachers or the student themselves can view documents
      const isAdmin = req.user.role === 'admin';
      const isTeacher = req.user.role === 'teacher';
      const isSelf = req.user.id === document.studentId;

      if (!isAdmin && !isTeacher && !isSelf) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this document" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error fetching student document:", error);
      res.status(500).json({ message: "Error fetching student document" });
    }
  });

  app.post("/api/students/:studentId/documents", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the student themselves can add documents
      const isAdmin = req.user.role === 'admin';
      const isSelf = req.user.id === studentId;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ message: "Forbidden: You can't add documents for this student" });
      }

      // Validate with schema
      const documentData = insertStudentDocumentSchema.parse({
        studentId,
        documentType: req.body.documentType,
        documentUrl: req.body.documentUrl,
        documentName: req.body.documentName
      });

      const document = await storage.addStudentDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error adding student document:", error);
        res.status(500).json({ message: "Error adding student document" });
      }
    }
  });

  app.delete("/api/student-documents/:documentId", async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const document = await storage.getStudentDocument(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check authentication and authorization
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the student themselves can delete documents
      const isAdmin = req.user.role === 'admin';
      const isSelf = req.user.id === document.studentId;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ message: "Forbidden: You can't delete this document" });
      }

      await storage.deleteStudentDocument(documentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student document:", error);
      res.status(500).json({ message: "Error deleting student document" });
    }
  });

  // Class Teacher Assignment APIs
  app.post("/api/classes/:classId/assign-teacher", app.locals.requireAdmin, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const teacherId = parseInt(req.body.teacherId);

      // Check if class exists
      const classObj = await storage.getClass(classId);
      if (!classObj) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if teacher exists and is actually a teacher
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({ message: "Invalid teacher" });
      }

      const client = await pool.connect();
      try {
        // Check if teacher is already assigned to this class
        const existingAssignment = await client.query(
          'SELECT id FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
          [classId, teacherId]
        );

        if (existingAssignment.rows.length > 0) {
          return res.status(400).json({ message: "Teacher is already assigned to this class" });
        }

        // Remove any existing class teacher for this class
        await client.query('DELETE FROM class_teachers WHERE class_id = $1', [classId]);

        // Assign new class teacher
        const result = await client.query(
          'INSERT INTO class_teachers (class_id, teacher_id) VALUES ($1, $2) RETURNING *',
          [classId, teacherId]
        );

        res.status(201).json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error assigning class teacher:", error);
      res.status(500).json({ message: "Error assigning class teacher" });
    }
  });

  app.get("/api/classes/:classId/teacher", async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);

      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT ct.*, u.name, u.email, u.teacher_id
          FROM class_teachers ct
          JOIN users u ON ct.teacher_id = u.id
          WHERE ct.class_id = $1
        `, [classId]);

        if (result.rows.length === 0) {
          return res.status(404).json({ message: "No class teacher assigned" });
        }

        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error fetching class teacher:", error);
      res.status(500).json({ message: "Error fetching class teacher" });
    }
  });

  app.delete("/api/classes/:classId/teacher", app.locals.requireAdmin, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);

      const client = await pool.connect();
      try {
        await client.query('DELETE FROM class_teachers WHERE class_id = $1', [classId]);
        res.status(204).send();
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error removing class teacher:", error);
      res.status(500).json({ message: "Error removing class teacher" });
    }
  });

  // Get teacher's assigned classes (as class teacher)
  app.get("/api/teachers/:teacherId/assigned-classes", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins or the teacher themselves can view assigned classes
      if (req.user.role !== 'admin' && req.user.id !== teacherId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT c.*, ct.assigned_at
          FROM class_teachers ct
          JOIN classes c ON ct.class_id = c.id
          WHERE ct.teacher_id = $1
        `, [teacherId]);

        res.json(result.rows);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error fetching teacher assigned classes:", error);
      res.status(500).json({ message: "Error fetching assigned classes" });
    }
  });

  // Get all class teacher assignments
  app.get("/api/class-teachers", app.locals.requireAdmin, async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT ct.*, c.name as class_name, c.grade, c.section, u.name as teacher_name, u.teacher_id
          FROM class_teachers ct
          JOIN classes c ON ct.class_id = c.id
          JOIN users u ON ct.teacher_id = u.id
          ORDER BY c.grade, c.section
        `);

        res.json(result.rows);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error fetching class teachers:", error);
      res.status(500).json({ message: "Error fetching class teachers" });
    }
  });

  // Attendance Management APIs
  app.post("/api/attendance", app.locals.requireTeacher, async (req, res) => {
    try {
      const { classId, studentId, date, isPresent, remarks } = req.body;
      const teacherId = req.user.id;

      // Verify teacher is assigned to this class
      const client = await pool.connect();
      try {
        const classTeacherCheck = await client.query(
          'SELECT id FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
          [classId, teacherId]
        );

        if (classTeacherCheck.rows.length === 0) {
          return res.status(403).json({ message: "You are not assigned as class teacher for this class" });
        }

        // Check if attendance already exists for this student on this date
        const existingAttendance = await client.query(
          'SELECT id FROM attendance WHERE student_id = $1 AND class_id = $2 AND date::date = $3::date',
          [studentId, classId, date]
        );

        if (existingAttendance.rows.length > 0) {
          // Update existing attendance
          const result = await client.query(`
            UPDATE attendance
            SET is_present = $1, remarks = $2, teacher_id = $3, recorded_at = NOW()
            WHERE student_id = $4 AND class_id = $5 AND date::date = $6::date
            RETURNING *
          `, [isPresent, remarks, teacherId, studentId, classId, date]);

          res.json(result.rows[0]);
        } else {
          // Create new attendance record
          const result = await client.query(`
            INSERT INTO attendance (student_id, class_id, teacher_id, date, is_present, remarks)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [studentId, classId, teacherId, date, isPresent, remarks]);

          res.status(201).json(result.rows[0]);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
      res.status(500).json({ message: "Error recording attendance" });
    }
  });

  app.get("/api/classes/:classId/attendance", app.locals.requireTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const teacherId = req.user.id;
      const date = req.query.date as string;

      // Verify teacher is assigned to this class
      const client = await pool.connect();
      try {
        const classTeacherCheck = await client.query(
          'SELECT id FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
          [classId, teacherId]
        );

        if (classTeacherCheck.rows.length === 0) {
          return res.status(403).json({ message: "You are not assigned as class teacher for this class" });
        }

        // Get students in this class with their attendance for the specified date
        let query = `
          SELECT
            u.id, u.name, u.roll_number,
            a.is_present, a.remarks, a.date
          FROM class_enrollments ce
          JOIN users u ON ce.student_id = u.id
          LEFT JOIN attendance a ON u.id = a.student_id AND a.class_id = $1
          WHERE ce.class_id = $1 AND u.role = 'student'
        `;

        const params = [classId];

        if (date) {
          query += ` AND (a.date IS NULL OR a.date::date = $2::date)`;
          params.push(date);
        }

        query += ` ORDER BY u.name`;

        const result = await client.query(query, params);
        res.json(result.rows);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Error fetching attendance" });
    }
  });

  // Assignment Management APIs
  app.post("/api/assignments", app.locals.requireTeacher, async (req, res) => {
    try {
      const { classId, studentId, assignmentTitle, assignmentDescription, dueDate, isCompleted, submissionDate, remarks } = req.body;
      const teacherId = req.user.id;

      // Verify teacher is assigned to this class
      const client = await pool.connect();
      try {
        const classTeacherCheck = await client.query(
          'SELECT id FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
          [classId, teacherId]
        );

        if (classTeacherCheck.rows.length === 0) {
          return res.status(403).json({ message: "You are not assigned as class teacher for this class" });
        }

        const result = await client.query(`
          INSERT INTO assignment_completions
          (student_id, class_id, teacher_id, assignment_title, assignment_description, due_date, is_completed, submission_date, remarks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [studentId, classId, teacherId, assignmentTitle, assignmentDescription, dueDate, isCompleted, submissionDate, remarks]);

        res.status(201).json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Error creating assignment" });
    }
  });

  app.get("/api/classes/:classId/assignments", app.locals.requireTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const teacherId = req.user.id;

      // Verify teacher is assigned to this class
      const client = await pool.connect();
      try {
        const classTeacherCheck = await client.query(
          'SELECT id FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
          [classId, teacherId]
        );

        if (classTeacherCheck.rows.length === 0) {
          return res.status(403).json({ message: "You are not assigned as class teacher for this class" });
        }

        // Get students in this class with their assignments
        const result = await client.query(`
          SELECT
            u.id as student_id, u.name as student_name, u.roll_number,
            ac.id as assignment_id, ac.assignment_title, ac.assignment_description,
            ac.due_date, ac.is_completed, ac.submission_date, ac.remarks, ac.recorded_at
          FROM class_enrollments ce
          JOIN users u ON ce.student_id = u.id
          LEFT JOIN assignment_completions ac ON u.id = ac.student_id AND ac.class_id = $1
          WHERE ce.class_id = $1 AND u.role = 'student'
          ORDER BY u.name, ac.recorded_at DESC
        `, [classId]);

        res.json(result.rows);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Error fetching assignments" });
    }
  });

  app.put("/api/assignments/:assignmentId", app.locals.requireTeacher, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const { isCompleted, submissionDate, remarks } = req.body;
      const teacherId = req.user.id;

      const client = await pool.connect();
      try {
        // Verify teacher owns this assignment
        const assignmentCheck = await client.query(
          'SELECT class_id FROM assignment_completions WHERE id = $1 AND teacher_id = $2',
          [assignmentId, teacherId]
        );

        if (assignmentCheck.rows.length === 0) {
          return res.status(403).json({ message: "You don't have permission to update this assignment" });
        }

        const result = await client.query(`
          UPDATE assignment_completions
          SET is_completed = $1, submission_date = $2, remarks = $3, recorded_at = NOW()
          WHERE id = $4
          RETURNING *
        `, [isCompleted, submissionDate, remarks, assignmentId]);

        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Error updating assignment" });
    }
  });

  // File upload route
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      // Log successful upload
      console.log("File uploaded successfully:", {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });

      // Return the file URL with full path
      const fileUrl = `/uploads/${req.file.filename}`;
      return res.status(200).json({
        success: true,
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        message: "File uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error"
      });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const httpServer = createServer(app);
  return httpServer;
}
