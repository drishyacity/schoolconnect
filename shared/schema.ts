import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher', 'student']);
export const contentTypeEnum = pgEnum('content_type', ['note', 'homework', 'dpp', 'quiz', 'lecture', 'sample_paper']);
export const categoryEnum = pgEnum('category', ['general', 'obc', 'sc', 'st', 'ews', 'other']);
export const religionEnum = pgEnum('religion', ['hindu', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'other']);

// Experience level enum
export const experienceLevelEnum = pgEnum('experience_level', ['beginner', '6months+', '1year+', '2years+', '3years+', '5years+']);

// Users table with additional fields for profiles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  profileImage: text("profile_image"),
  bio: text("bio"),                // Short bio

  // Student-specific fields
  grade: integer("grade"),         // For students: which grade they are in
  section: text("section"),        // For students: which section they are in
  age: integer("age"),             // Student's age
  rollNumber: text("roll_number"), // Student's roll number
  admissionNo: text("admission_no"), // School admission number
  admissionDate: timestamp("admission_date"), // Date of admission
  aadharNo: text("aadhar_no"),     // Aadhar card number
  documents: json("documents"),    // JSON array of document URLs
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  guardianName: text("guardian_name"),
  parentsEmail: text("parents_email"),
  parentsMobile: text("parents_mobile"),
  mobileNumber: text("mobile_number"),  // Student's personal mobile number
  guardianMobile: text("guardian_mobile"),
  address: text("address"),
  busStop: text("bus_stop"),       // Bus stop for school transportation
  category: categoryEnum("category"),  // OBC, General, SC, ST, EWS, etc
  religion: religionEnum("religion"),

  // Teacher-specific fields
  experienceLevel: experienceLevelEnum("experience_level"), // For teachers
  teacherId: text("teacher_id"),   // Unique ID assigned to teacher

  // Common fields
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  grade: integer("grade").notNull(), // Grade level (1-12)
  section: text("section"), // Section like A, B, C, etc.
});

// Class-Subject-Teacher association table
export const classSubjects = pgTable("class_subjects", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  teacherId: integer("teacher_id").references(() => users.id).notNull(),
});

// Class enrollments table
export const classEnrollments = pgTable("class_enrollments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
});

// Content table
export const contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  contentType: contentTypeEnum("content_type").notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").default('published'),
});

// Quizzes table
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").references(() => contents.id).notNull(),
  timeLimit: integer("time_limit").notNull(), // In minutes
  passingScore: integer("passing_score").notNull(), // Required to pass (%)
  totalPoints: integer("total_points"),
});

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id).notNull(),
  text: text("text").notNull(),
  options: json("options").notNull(), // Array of options with { id, text, isCorrect }
  points: integer("points").default(1).notNull(),
  order: integer("order").default(0).notNull(), // Order of questions in the quiz
});

// Quiz attempts table
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  answers: json("answers"), // Student's answers
});

// Teacher qualifications table - allows multiple qualifications per teacher
export const teacherQualifications = pgTable("teacher_qualifications", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").references(() => users.id).notNull(),
  qualification: text("qualification").notNull(), // Degree/certification name
  institution: text("institution").notNull(),     // Institution name
  year: integer("year"),                         // Year of completion
});

// Teacher subjects table - tracks which subjects a teacher can teach (max 3)
export const teacherSubjects = pgTable("teacher_subjects", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").references(() => users.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
});

// Document types enum
export const documentTypeEnum = pgEnum('document_type', [
  'aadhar', 'transfer_certificate', 'previous_result', 'birth_certificate', 'other'
]);

// Student documents table - allows multiple documents per student
export const studentDocuments = pgTable("student_documents", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  documentName: text("document_name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Class teachers table - assigns teachers as class teachers
export const classTeachers = pgTable("class_teachers", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  teacherId: integer("teacher_id").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Attendance table - daily attendance records
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  teacherId: integer("teacher_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  isPresent: boolean("is_present").notNull(),
  remarks: text("remarks"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// Assignment completion table - tracks homework/assignment completion
export const assignmentCompletions = pgTable("assignment_completions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  teacherId: integer("teacher_id").references(() => users.id).notNull(),
  assignmentTitle: text("assignment_title").notNull(),
  assignmentDescription: text("assignment_description"),
  dueDate: timestamp("due_date"),
  isCompleted: boolean("is_completed").notNull(),
  submissionDate: timestamp("submission_date"),
  remarks: text("remarks"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  joinedAt: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
});

export const insertClassSubjectSchema = createInsertSchema(classSubjects).omit({
  id: true,
});

export const insertClassEnrollmentSchema = createInsertSchema(classEnrollments).omit({
  id: true,
});

export const insertContentSchema = createInsertSchema(contents).omit({
  id: true,
  createdAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  startedAt: true,
});

export const insertTeacherQualificationSchema = createInsertSchema(teacherQualifications).omit({
  id: true,
});

export const insertTeacherSubjectSchema = createInsertSchema(teacherSubjects).omit({
  id: true,
});

export const insertStudentDocumentSchema = createInsertSchema(studentDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertClassTeacherSchema = createInsertSchema(classTeachers).omit({
  id: true,
  assignedAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  recordedAt: true,
});

export const insertAssignmentCompletionSchema = createInsertSchema(assignmentCompletions).omit({
  id: true,
  recordedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type ClassSubject = typeof classSubjects.$inferSelect;
export type InsertClassSubject = z.infer<typeof insertClassSubjectSchema>;

export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type InsertClassEnrollment = z.infer<typeof insertClassEnrollmentSchema>;

export type Content = typeof contents.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;

export type TeacherQualification = typeof teacherQualifications.$inferSelect;
export type InsertTeacherQualification = z.infer<typeof insertTeacherQualificationSchema>;

export type TeacherSubject = typeof teacherSubjects.$inferSelect;
export type InsertTeacherSubject = z.infer<typeof insertTeacherSubjectSchema>;

export type StudentDocument = typeof studentDocuments.$inferSelect;
export type InsertStudentDocument = z.infer<typeof insertStudentDocumentSchema>;

export type ClassTeacher = typeof classTeachers.$inferSelect;
export type InsertClassTeacher = z.infer<typeof insertClassTeacherSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type AssignmentCompletion = typeof assignmentCompletions.$inferSelect;
export type InsertAssignmentCompletion = z.infer<typeof insertAssignmentCompletionSchema>;

// Extended types for UI
export type QuizWithQuestions = Quiz & {
  questions: Question[];
  title: string;
  description: string | null;
  classId: number;
  subjectId: number;
  authorId: number;
  status: string | null;
  createdAt: Date;
  class?: Class;
  subject?: Subject;
  author?: User;
};

export type ContentWithDetails = Content & {
  author: User;
  class: Class;
  subject: Subject;
};

export type ClassSubjectWithDetails = ClassSubject & {
  subject: Subject;
  teacher: User;
};

export type ClassWithDetails = Class & {
  subjects?: ClassSubjectWithDetails[];
  students?: User[];
  contents?: Content[];
};

export type TeacherWithDetails = User & {
  qualifications?: TeacherQualification[];
  subjects?: (TeacherSubject & { subject: Subject })[];
  classes?: ClassWithDetails[];
  contentCount?: number;
};

export type StudentWithDetails = User & {
  enrolledClasses?: ClassWithDetails[];
  completedQuizzes?: number;
  totalQuizzes?: number;
  averageScore?: number;
  documents?: StudentDocument[];
  // Add separate mobile number field for students
  mobileNumber?: string | null;
  // New fields for attendance and assignments
  attendancePercentage?: number;
  totalAssignments?: number;
  completedAssignments?: number;
  recentAttendance?: Attendance[];
  recentAssignments?: AssignmentCompletion[];
};

export type ClassWithTeacher = Class & {
  classTeacher?: User;
  students?: StudentWithDetails[];
  subjects?: ClassSubjectWithDetails[];
};
