import {
  users,
  subjects,
  classes,
  classSubjects,
  classEnrollments,
  contents,
  quizzes,
  questions,
  quizAttempts,
  teacherQualifications,
  teacherSubjects,
  studentDocuments,
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
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, or, sql, desc, asc, count, inArray, isNull, isNotNull } from "drizzle-orm";
import { json } from "drizzle-orm/pg-core";
import { checkConnection } from "./db";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

// Define an interface for all storage operations
export interface IStorage {
  // Session store
  sessionStore: any; // Using any here as session.SessionStore is not exported

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(role?: string): Promise<User[]>;
  countUsers(role?: string): Promise<number>;
  getRecentUsers(limit: number): Promise<User[]>;

  // Subject operations
  createSubject(subject: InsertSubject): Promise<Subject>;
  getAllSubjects(): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjectsWithClassCount(): Promise<(Subject & { classCount: number })[]>;

  // Class operations
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, data: Partial<Class>): Promise<Class>;
  getAllClasses(): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  getClassWithDetails(id: number): Promise<ClassWithDetails | undefined>;
  countClasses(): Promise<number>;

  // Class Subject operations
  createClassSubject(data: InsertClassSubject): Promise<ClassSubject>;
  deleteClassSubject(id: number): Promise<void>;

  // Class enrollment operations
  createEnrollment(enrollment: InsertClassEnrollment): Promise<ClassEnrollment>;
  getStudentClasses(studentId: number): Promise<ClassWithDetails[]>;
  getTeacherClasses(teacherId: number): Promise<ClassWithDetails[]>;
  countTeacherStudents(teacherId: number): Promise<number>;

  // Content operations
  createContent(content: InsertContent): Promise<Content>;
  getContents(contentType?: string, classId?: number, subjectId?: number): Promise<ContentWithDetails[]>;
  getContent(id: number): Promise<Content | undefined>;
  updateContent(id: number, data: Partial<Content>): Promise<Content>;
  deleteContent(id: number): Promise<void>;
  countTeacherContents(teacherId: number): Promise<number>;

  // Quiz operations
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizzes(classId?: number, subjectId?: number, authorId?: number): Promise<Quiz[]>;
  getQuizWithQuestions(id: number): Promise<QuizWithQuestions | undefined>;
  countQuizzes(): Promise<number>;

  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestions(quizId: number): Promise<Question[]>;

  // Quiz attempt operations
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  updateQuizAttempt(id: number, data: Partial<QuizAttempt>): Promise<QuizAttempt>;
  countStudentCompletedQuizzes(studentId: number): Promise<number>;
  countStudentTotalQuizzes(studentId: number): Promise<number>;
  getStudentAverageScore(studentId: number): Promise<number>;

  // Teacher profile operations
  createTeacherQualification(qualification: InsertTeacherQualification): Promise<TeacherQualification>;
  getTeacherQualifications(teacherId: number): Promise<TeacherQualification[]>;
  deleteTeacherQualification(id: number): Promise<void>;
  createTeacherSubject(teacherSubject: InsertTeacherSubject): Promise<TeacherSubject>;
  getTeacherSubjects(teacherId: number): Promise<(TeacherSubject & { subject: Subject })[]>;
  deleteTeacherSubject(id: number): Promise<void>;
  getTeacherWithDetails(teacherId: number): Promise<TeacherWithDetails | undefined>;
  countTeacherSubjects(teacherId: number): Promise<number>;
  updateUserProfile(userId: number, data: Partial<User>): Promise<User>;
  assignStudentToClass(studentId: number, classId: number): Promise<ClassEnrollment>;
  getStudentWithDetails(studentId: number): Promise<StudentWithDetails | undefined>;

  // Student document operations
  addStudentDocument(document: InsertStudentDocument): Promise<StudentDocument>;
  getStudentDocuments(studentId: number): Promise<StudentDocument[]>;
  getStudentDocument(documentId: number): Promise<StudentDocument | undefined>;
  deleteStudentDocument(documentId: number): Promise<void>;

  // Dashboard data
  countPendingGrading(teacherId: number): Promise<number>;
  countStudentPendingAssignments(studentId: number): Promise<number>;
  getTeacherUpcomingDeadlines(teacherId: number, limit: number): Promise<Content[]>;
  getStudentUpcomingDeadlines(studentId: number, limit: number): Promise<Content[]>;
  getRecentActivities(limit: number): Promise<any[]>;

  deleteUser(userId: number): Promise<void>;
}

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  sessionStore: any; // Using any here as session.SessionStore is not exported
  private userMap: Map<number, User>;
  private subjectMap: Map<number, Subject>;
  private classMap: Map<number, Class>;
  private classSubjectMap: Map<number, ClassSubject>;
  private enrollmentMap: Map<number, ClassEnrollment>;
  private contentMap: Map<number, Content>;
  private quizMap: Map<number, Quiz>;
  private questionMap: Map<number, Question>;
  private attemptMap: Map<number, QuizAttempt>;
  private teacherQualificationMap: Map<number, TeacherQualification>;
  private teacherSubjectMap: Map<number, TeacherSubject>;
  private studentDocumentMap: Map<number, StudentDocument>;
  private currentId: {
    users: number;
    subjects: number;
    classes: number;
    classSubjects: number;
    enrollments: number;
    contents: number;
    quizzes: number;
    questions: number;
    attempts: number;
    teacherQualifications: number;
    teacherSubjects: number;
    studentDocuments: number;
  };

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Clear expired sessions every 24h
    });
    this.userMap = new Map();
    this.subjectMap = new Map();
    this.classMap = new Map();
    this.classSubjectMap = new Map();
    this.enrollmentMap = new Map();
    this.contentMap = new Map();
    this.quizMap = new Map();
    this.questionMap = new Map();
    this.attemptMap = new Map();
    this.teacherQualificationMap = new Map();
    this.teacherSubjectMap = new Map();
    this.studentDocumentMap = new Map();

    this.currentId = {
      users: 1,
      subjects: 1,
      classes: 1,
      classSubjects: 1,
      enrollments: 1,
      contents: 1,
      quizzes: 1,
      questions: 1,
      attempts: 1,
      teacherQualifications: 1,
      teacherSubjects: 1,
      studentDocuments: 1
    };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.userMap.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.userMap.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.userMap.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = {
      ...insertUser,
      id,
      profileImage: insertUser.profileImage || null,
      grade: insertUser.grade || null,
      section: insertUser.section || null,
      experienceLevel: insertUser.experienceLevel || null,
      bio: insertUser.bio || null,
      joinedAt: new Date()
    };
    this.userMap.set(id, user);
    return user;
  }

  async updateUserProfile(userId: number, data: Partial<User>): Promise<User> {
    const user = this.userMap.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Process date fields if present
    const processedData = { ...data };

    // Handle admissionDate conversion if it exists and is in string format
    if (processedData.admissionDate && typeof processedData.admissionDate === 'string') {
      console.log("Original admissionDate:", processedData.admissionDate);

      try {
        const dateStr = processedData.admissionDate as string;
        // Check if it's in dd/mm/yyyy format
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/').map(Number);
          const date = new Date(year, month - 1, day);

          if (!isNaN(date.getTime())) {
            processedData.admissionDate = date;
            console.log("Converted admissionDate from dd/mm/yyyy to Date:", date);
          } else {
            console.error("Invalid date format:", dateStr);
          }
        } else {
          // Try to parse as standard date
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            processedData.admissionDate = date;
            console.log("Parsed admissionDate as standard date:", date);
          } else {
            console.error("Failed to parse date:", dateStr);
          }
        }
      } catch (error) {
        console.error("Error converting date:", error);
      }
    }

    const updatedUser = { ...user, ...processedData };
    this.userMap.set(userId, updatedUser);
    console.log("User profile updated with data:", updatedUser);
    return updatedUser;
  }

  async getUsers(role?: string): Promise<User[]> {
    const users = Array.from(this.userMap.values());
    if (role) {
      return users.filter(user => user.role === role);
    }
    return users;
  }

  async countUsers(role?: string): Promise<number> {
    if (role) {
      return Array.from(this.userMap.values()).filter(user => user.role === role).length;
    }
    return this.userMap.size;
  }

  async getRecentUsers(limit: number): Promise<User[]> {
    // In a real DB, you would order by creation date
    // Here we just take the most recently created users by ID
    return Array.from(this.userMap.values())
      .sort((a, b) => b.id - a.id)
      .slice(0, limit);
  }

  // Subject operations
  async createSubject(subject: InsertSubject): Promise<Subject> {
    const id = this.currentId.subjects++;
    const newSubject: Subject = {
      ...subject,
      id,
      description: subject.description ?? null
    };
    this.subjectMap.set(id, newSubject);
    return newSubject;
  }

  async getAllSubjects(): Promise<Subject[]> {
    try {
      console.log("Starting to fetch all subjects...");

      // First check if we can connect to the database
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.error("Cannot fetch subjects: Database connection failed");
        return [];
      }

      console.log("Database connection successful, querying subjects table...");
      const result = await db.select().from(subjects);

      if (!result || result.length === 0) {
        console.log("No subjects found in database");
        return [];
      }

      // Log each subject for debugging
      result.forEach(subject => {
        console.log(`Found subject: ${subject.name} (ID: ${subject.id})`);
      });

      console.log(`Successfully fetched ${result.length} subjects`);
      return result;
    } catch (error) {
      console.error("Error in getAllSubjects:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return [];
    }
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjectMap.get(id);
  }

  async getSubjectsWithClassCount(): Promise<(Subject & { classCount: number })[]> {
    try {
      console.log("Starting to fetch subjects with class counts...");

      // First check database connection
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.error("Cannot fetch subjects: Database connection failed");
        return [];
      }

      // First get all subjects
      const allSubjects = await db.select().from(subjects);
      console.log("Fetched all subjects:", allSubjects);

      // Then get class counts for each subject
      const classCounts = await db
        .select({
          subjectId: classSubjects.subjectId,
          count: sql<number>`COUNT(DISTINCT ${classSubjects.classId})::int`
        })
        .from(classSubjects)
        .groupBy(classSubjects.subjectId);

      console.log("Fetched class counts:", classCounts);

      // Create a map of subject IDs to their class counts
      const classCountMap = new Map(
        classCounts.map(item => [item.subjectId, item.count])
      );

      // Combine the data, defaulting to 0 for subjects without classes
      const result = allSubjects.map(subject => ({
        ...subject,
        classCount: classCountMap.get(subject.id) || 0
      }));

      console.log("Final subjects with counts:", result);
      return result;
    } catch (error: unknown) {
      console.error("Error fetching subjects with class counts:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
      return [];
    }
  }

  // Class operations
  async createClass(classData: InsertClass): Promise<Class> {
    const id = this.currentId.classes++;
    const newClass: Class = {
      ...classData,
      id,
      description: classData.description ?? null,
      section: classData.section ?? null
    };
    this.classMap.set(id, newClass);
    return newClass;
  }

  async updateClass(id: number, data: Partial<Class>): Promise<Class> {
    const existingClass = this.classMap.get(id);
    if (!existingClass) {
      throw new Error("Class not found");
    }

    const updatedClass = { ...existingClass, ...data };
    this.classMap.set(id, updatedClass);
    return updatedClass;
  }

  async getAllClasses(): Promise<Class[]> {
    return Array.from(this.classMap.values());
  }

  async getClass(id: number): Promise<Class | undefined> {
    return this.classMap.get(id);
  }

  async getClassWithDetails(id: number): Promise<ClassWithDetails | undefined> {
    const classData = this.classMap.get(id);
    if (!classData) return undefined;

    // Get class subjects with subject and teacher details
    const classSubjectsData = Array.from(this.classSubjectMap.values())
      .filter(cs => cs.classId === id)
      .map(cs => {
        const subject = this.subjectMap.get(cs.subjectId);
        const teacher = this.userMap.get(cs.teacherId);
        return {
          ...cs,
          subject,
          teacher
        } as ClassSubjectWithDetails;
      });

    // Get enrolled students
    const enrollments = Array.from(this.enrollmentMap.values())
      .filter(enrollment => enrollment.classId === id);

    const students = enrollments.map(enrollment =>
      this.userMap.get(enrollment.studentId)
    ).filter(Boolean) as User[];

    // Get class contents
    const contents = Array.from(this.contentMap.values())
      .filter(content => content.classId === id);

    return {
      ...classData,
      subjects: classSubjectsData,
      students,
      contents
    };
  }

  async countClasses(): Promise<number> {
    return this.classMap.size;
  }

  // Class Subject operations
  async createClassSubject(data: InsertClassSubject): Promise<ClassSubject> {
    const id = this.currentId.classSubjects++;
    const newClassSubject: ClassSubject = { ...data, id };
    this.classSubjectMap.set(id, newClassSubject);
    return newClassSubject;
  }

  async deleteClassSubject(id: number): Promise<void> {
    this.classSubjectMap.delete(id);
  }

  // Class enrollment operations
  async createEnrollment(enrollment: InsertClassEnrollment): Promise<ClassEnrollment> {
    const id = this.currentId.enrollments++;
    const newEnrollment: ClassEnrollment = { ...enrollment, id };
    this.enrollmentMap.set(id, newEnrollment);
    return newEnrollment;
  }

  async getStudentClasses(studentId: number): Promise<ClassWithDetails[]> {
    const enrollments = Array.from(this.enrollmentMap.values())
      .filter(enrollment => enrollment.studentId === studentId);

    const classDetails: ClassWithDetails[] = [];

    for (const enrollment of enrollments) {
      const classDetail = await this.getClassWithDetails(enrollment.classId);
      if (classDetail) {
        classDetails.push(classDetail);
      }
    }

    return classDetails;
  }

  async getTeacherClasses(teacherId: number): Promise<ClassWithDetails[]> {
    // Find classes where this teacher teaches any subject
    const teacherClassSubjects = Array.from(this.classSubjectMap.values())
      .filter(cs => cs.teacherId === teacherId);

    // Get unique class IDs
    const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

    const classDetails: ClassWithDetails[] = [];

    for (const classId of classIds) {
      const classDetail = await this.getClassWithDetails(classId);
      if (classDetail) {
        classDetails.push(classDetail);
      }
    }

    return classDetails;
  }

  async countTeacherStudents(teacherId: number): Promise<number> {
    // Find all classes where this teacher teaches any subject
    const teacherClassSubjects = Array.from(this.classSubjectMap.values())
      .filter(cs => cs.teacherId === teacherId);

    // Get unique class IDs
    const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

    // Get all unique student IDs from enrollments in teacher's classes
    const uniqueStudentIds = new Set<number>();

    Array.from(this.enrollmentMap.values())
      .filter(enrollment => classIds.includes(enrollment.classId))
      .forEach(enrollment => uniqueStudentIds.add(enrollment.studentId));

    return uniqueStudentIds.size;
  }

  // Content operations
  async createContent(content: InsertContent): Promise<Content> {
    const id = this.currentId.contents++;
    const newContent: Content = {
      ...content,
      id,
      createdAt: new Date(),
      description: content.description ?? null,
      classId: content.classId ?? null,
      fileUrl: content.fileUrl ?? null,
      dueDate: content.dueDate ?? null
    };
    this.contentMap.set(id, newContent);
    return newContent;
  }

  async getContents(contentType?: string, classId?: number, subjectId?: number): Promise<ContentWithDetails[]> {
    let contents = Array.from(this.contentMap.values());

    if (contentType) {
      contents = contents.filter(content => content.contentType === contentType);
    }

    if (classId !== undefined) {
      contents = contents.filter(content => content.classId === classId);
    }

    if (subjectId !== undefined) {
      contents = contents.filter(content => content.subjectId === subjectId);
    }

    // Add author details to each content
    const contentsWithDetails: ContentWithDetails[] = [];

    for (const content of contents) {
      const author = this.userMap.get(content.authorId);
      const classData = content.classId ? this.classMap.get(content.classId) : undefined;
      const subjectData = content.subjectId ? this.subjectMap.get(content.subjectId) : undefined;

      if (author && classData && subjectData) {
        contentsWithDetails.push({
          ...content,
          author,
          class: classData,
          subject: subjectData
        });
      }
    }

    return contentsWithDetails;
  }

  async getContent(id: number): Promise<Content | undefined> {
    return this.contentMap.get(id);
  }

  async updateContent(id: number, data: Partial<Content>): Promise<Content> {
    const content = this.contentMap.get(id);
    if (!content) {
      throw new Error("Content not found");
    }

    const updatedContent = { ...content, ...data };
    this.contentMap.set(id, updatedContent);
    return updatedContent;
  }

  async deleteContent(id: number): Promise<void> {
    // First check if content exists
    if (!this.contentMap.has(id)) {
      throw new Error("Content not found");
    }

    // Delete associated resources if needed (e.g., quiz and questions for quiz content)
    const content = this.contentMap.get(id);
    if (content?.contentType === 'quiz') {
      // Find quiz associated with this content
      const quiz = Array.from(this.quizMap.values())
        .find(q => q.contentId === id);

      if (quiz) {
        // Delete all questions for this quiz
        const questionIds = Array.from(this.questionMap.values())
          .filter(q => q.quizId === quiz.id)
          .map(q => q.id);

        questionIds.forEach(qId => this.questionMap.delete(qId));

        // Delete quiz
        this.quizMap.delete(quiz.id);
      }
    }

    // Delete the content
    this.contentMap.delete(id);
  }

  async countTeacherContents(teacherId: number): Promise<number> {
    return Array.from(this.contentMap.values())
      .filter(content => content.authorId === teacherId)
      .length;
  }

  // Quiz operations
  async getQuiz(id: number): Promise<Quiz | undefined> {
    try {
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
      return quiz;
    } catch (error) {
      console.error("Error fetching quiz:", error);
      throw error;
    }
  }

  async updateQuiz(id: number, data: Partial<Quiz>): Promise<Quiz> {
    try {
      console.log("Updating quiz with ID:", id);
      console.log("Update data:", data);

      const [updatedQuiz] = await db
        .update(quizzes)
        .set(data)
        .where(eq(quizzes.id, id))
        .returning();

      if (!updatedQuiz) {
        throw new Error("Quiz not found");
      }

      console.log("Quiz updated successfully:", updatedQuiz);
      return updatedQuiz;
    } catch (error) {
      console.error("Error updating quiz:", error);
      throw error;
    }
  }

  async createQuiz(quizData: any): Promise<Quiz> {
    try {
      // First, create a content entry for the quiz
      const [content] = await db.insert(contents)
        .values({
          title: quizData.title,
          description: quizData.description,
          classId: quizData.classId,
          subjectId: quizData.subjectId,
          authorId: quizData.authorId,
          status: quizData.status || 'draft',
          contentType: 'quiz' as any,
          createdAt: new Date()
        })
        .returning();

      // Then create the quiz with the content ID
      const [newQuiz] = await db.insert(quizzes)
        .values({
          contentId: content.id,
          timeLimit: quizData.timeLimit,
          passingScore: quizData.passingScore,
          totalPoints: quizData.totalPoints || 0
        })
        .returning();

      // Create questions
      if (quizData.questions && Array.isArray(quizData.questions)) {
        for (const question of quizData.questions) {
          await db.insert(questions)
            .values({
              quizId: newQuiz.id,
              text: question.text,
              options: question.options,
              points: question.points,
              order: question.order
            });
        }
      }

      // Return a combined object that includes both quiz and content data
      return {
        ...newQuiz,
        title: content.title,
        description: content.description,
        classId: content.classId,
        subjectId: content.subjectId,
        authorId: content.authorId,
        status: content.status || 'draft',
        createdAt: content.createdAt
      } as unknown as Quiz;
    } catch (error) {
      console.error("Error creating quiz:", error);
      throw error;
    }
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    // Get the quiz by ID
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    if (!quiz) return undefined;

    // Get the content associated with this quiz
    const [content] = await db.select().from(contents).where(eq(contents.id, quiz.contentId));
    if (!content) return undefined;

    // Combine quiz data with content data
    return {
      ...quiz,
      title: content.title,
      description: content.description,
      classId: content.classId,
      subjectId: content.subjectId,
      authorId: content.authorId,
      status: content.status,
      createdAt: content.createdAt
    } as unknown as Quiz;
  }

  async getQuizzes(classId?: number, subjectId?: number, authorId?: number): Promise<Quiz[]> {
    // Build a query to get all quizzes with their content information
    const allQuizzes: Quiz[] = [];

    // First get all quizzes
    const quizRecords = await db.select().from(quizzes);

    // Now for each quiz, get its content info
    for (const quiz of quizRecords) {
      const [content] = await db.select()
        .from(contents)
        .where(eq(contents.id, quiz.contentId));

      if (!content) continue; // Skip if no content (shouldn't happen)

      // Apply filters based on content properties
      if (classId !== undefined && content.classId !== classId) continue;
      if (subjectId !== undefined && content.subjectId !== subjectId) continue;
      if (authorId !== undefined && content.authorId !== authorId) continue;

      // Combine quiz and content data
      allQuizzes.push({
        ...quiz,
        title: content.title,
        description: content.description,
        classId: content.classId,
        subjectId: content.subjectId,
        authorId: content.authorId,
        status: content.status,
        createdAt: content.createdAt
      } as unknown as Quiz);
    }

    return allQuizzes;
  }

  async getQuizWithQuestions(id: number): Promise<QuizWithQuestions | undefined> {
    // Get the quiz by ID
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    if (!quiz) return undefined;

    // Get the content associated with this quiz
    const [content] = await db.select().from(contents).where(eq(contents.id, quiz.contentId));
    if (!content) return undefined;

    // Get all questions for this quiz
    const questions = await this.getQuestions(id);

    // Combine quiz data with content data and questions
    const quizWithQuestions = {
      ...quiz,
      title: content.title,
      description: content.description,
      classId: content.classId,
      subjectId: content.subjectId,
      authorId: content.authorId,
      status: content.status,
      createdAt: content.createdAt,
      questions: questions
    } as unknown as QuizWithQuestions;

    return quizWithQuestions;
  }

  async countQuizzes(): Promise<number> {
    // Get the count of all quizzes in the database
    const [result] = await db.select({ count: count() }).from(quizzes);
    return Number(result?.count) || 0;
  }

  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    // Ensure all required fields are present
    const questionData = {
      quizId: question.quizId,
      text: question.text,
      options: question.options,
      points: question.points || 1,
      order: question.order || 0
    };

    // Insert and return the new question
    const [newQuestion] = await db.insert(questions)
      .values(questionData)
      .returning();

    return newQuestion;
  }

  async getQuestions(quizId: number): Promise<Question[]> {
    return await db.select()
      .from(questions)
      .where(eq(questions.quizId, quizId))
      .orderBy(asc(questions.order));
  }

  // Quiz attempt operations
  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    // Create a new quiz attempt with default values for completedAt and score
    const attemptData = {
      quizId: attempt.quizId,
      studentId: attempt.studentId,
      startedAt: new Date(),
      completedAt: null,
      score: null,
      answers: attempt.answers || {}
    };

    // Insert the attempt into the database
    const [newAttempt] = await db.insert(quizAttempts)
      .values(attemptData)
      .returning();

    return newAttempt;
  }

  async updateQuizAttempt(id: number, data: Partial<QuizAttempt>): Promise<QuizAttempt> {
    // Update the attempt with the provided data
    const [updatedAttempt] = await db.update(quizAttempts)
      .set(data)
      .where(eq(quizAttempts.id, id))
      .returning();

    if (!updatedAttempt) {
      throw new Error("Quiz attempt not found");
    }

    return updatedAttempt;
  }

  async countStudentCompletedQuizzes(studentId: number): Promise<number> {
    // Count completed quiz attempts for the student
    const [result] = await db.select({ count: count() })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          sql`${quizAttempts.completedAt} IS NOT NULL`
        )
      );

    return Number(result?.count) || 0;
  }

  async countStudentTotalQuizzes(studentId: number): Promise<number> {
    // Get all classes the student is enrolled in
    const enrollments = await db.select()
      .from(classEnrollments)
      .where(eq(classEnrollments.studentId, studentId));

    if (enrollments.length === 0) return 0;

    const classIds = enrollments.map(e => e.classId);

    // Count all quizzes in those classes
    const [result] = await db.select({ count: count() })
      .from(contents)
      .where(
        and(
          eq(contents.contentType, 'quiz' as any),
          inArray(contents.classId, classIds)
        )
      );

    return Number(result?.count) || 0;
  }

  async getStudentAverageScore(studentId: number): Promise<number> {
    // Get all attempts by this student with a score
    const attempts = await db.select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          sql`${quizAttempts.score} IS NOT NULL`
        )
      );

    // If no attempts with scores, return 0
    if (attempts.length === 0) {
      return 0;
    }

    // Calculate the average score
    const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
    return Math.round((totalScore / attempts.length) * 100) / 100;
  }

  // Teacher qualifications
  async createTeacherQualification(qualification: InsertTeacherQualification): Promise<TeacherQualification> {
    const id = this.currentId.teacherQualifications++;
    const newQualification: TeacherQualification = {
      ...qualification,
      id,
      year: qualification.year || null
    };
    this.teacherQualificationMap.set(id, newQualification);
    return newQualification;
  }

  async getTeacherQualifications(teacherId: number): Promise<TeacherQualification[]> {
    return Array.from(this.teacherQualificationMap.values())
      .filter(qual => qual.teacherId === teacherId)
      .sort((a, b) => {
        // Sort by year descending (most recent first)
        if (!a.year) return 1;
        if (!b.year) return -1;
        return b.year - a.year;
      });
  }

  async getTeacherQualification(id: number): Promise<TeacherQualification | undefined> {
    return this.teacherQualificationMap.get(id);
  }

  async deleteTeacherQualification(id: number): Promise<void> {
    this.teacherQualificationMap.delete(id);
  }

  // Teacher subjects
  async createTeacherSubject(teacherSubject: InsertTeacherSubject): Promise<TeacherSubject> {
    const id = this.currentId.teacherSubjects++;
    const newSubject: TeacherSubject = { ...teacherSubject, id };
    this.teacherSubjectMap.set(id, newSubject);
    return newSubject;
  }

  async getTeacherSubjects(teacherId: number): Promise<(TeacherSubject & { subject: Subject })[]> {
    return Array.from(this.teacherSubjectMap.values())
      .filter(ts => ts.teacherId === teacherId)
      .map(ts => {
        const subject = this.subjectMap.get(ts.subjectId);
        if (!subject) {
          throw new Error(`Subject with ID ${ts.subjectId} not found`);
        }
        return { ...ts, subject };
      });
  }

  async getTeacherSubject(id: number): Promise<TeacherSubject | undefined> {
    return this.teacherSubjectMap.get(id);
  }

  async deleteTeacherSubject(id: number): Promise<void> {
    this.teacherSubjectMap.delete(id);
  }

  async countTeacherSubjects(teacherId: number): Promise<number> {
    return Array.from(this.teacherSubjectMap.values())
      .filter(ts => ts.teacherId === teacherId)
      .length;
  }

  // Get teacher with details
  async getTeacherWithDetails(teacherId: number): Promise<TeacherWithDetails | undefined> {
    const teacher = this.userMap.get(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return undefined;
    }

    const qualifications = await this.getTeacherQualifications(teacherId);
    const subjects = await this.getTeacherSubjects(teacherId);

    return {
      ...teacher,
      qualifications,
      subjects
    };
  }

  // Student enrollment
  async assignStudentToClass(studentId: number, classId: number): Promise<ClassEnrollment> {
    // Check if student is already enrolled in this class
    const existingEnrollment = Array.from(this.enrollmentMap.values())
      .find(enrollment => enrollment.studentId === studentId && enrollment.classId === classId);

    if (existingEnrollment) {
      return existingEnrollment;
    }

    // Create new enrollment
    const enrollment = await this.createEnrollment({ studentId, classId });

    // Update student's grade and section based on the class
    const classObj = this.classMap.get(classId);
    if (classObj) {
      const student = this.userMap.get(studentId);
      if (student) {
        student.grade = classObj.grade;
        student.section = classObj.section;
        this.userMap.set(studentId, student);
      }
    }

    return enrollment;
  }

  // Get student with details
  async getStudentWithDetails(studentId: number): Promise<StudentWithDetails | undefined> {
    const student = this.userMap.get(studentId);
    if (!student || student.role !== 'student') {
      return undefined;
    }

    const enrolledClasses = await this.getStudentClasses(studentId);
    const completedQuizzes = await this.countStudentCompletedQuizzes(studentId);
    const totalQuizzes = await this.countStudentTotalQuizzes(studentId);
    const averageScore = await this.getStudentAverageScore(studentId);

    // Since we're adding the document methods now
    let documents: StudentDocument[] = [];
    // Only try to get documents if the method is fully implemented
    if (typeof this.getStudentDocuments === 'function') {
      documents = await this.getStudentDocuments(studentId);
    }

    return {
      ...student,
      enrolledClasses,
      completedQuizzes,
      totalQuizzes,
      averageScore,
      documents,
      // Add mobileNumber field using parentsMobile as the initial value
      mobileNumber: student.parentsMobile
    };
  }

  // Dashboard data
  async countPendingGrading(teacherId: number): Promise<number> {
    // Find all classes where this teacher teaches
    const teacherClassSubjects = await db.select()
      .from(classSubjects)
      .where(eq(classSubjects.teacherId, teacherId));

    if (teacherClassSubjects.length === 0) return 0;

    // Get unique class IDs
    const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

    // Find all quiz contents in these classes
    const quizContents = await db.select()
      .from(contents)
      .where(
        and(
          eq(contents.contentType, 'quiz' as any),
          inArray(contents.classId, classIds)
        )
      );

    if (quizContents.length === 0) return 0;

    const contentIds = quizContents.map(c => c.id);

    // Find all quizzes for these contents
    const allQuizzes = await db.select()
      .from(quizzes)
      .where(inArray(quizzes.contentId, contentIds));

    if (allQuizzes.length === 0) return 0;

    const quizIds = allQuizzes.map(quiz => quiz.id);

    // Count all quiz attempts that need grading
    const [result] = await db.select({ count: count() })
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, quizIds),
          sql`${quizAttempts.completedAt} IS NOT NULL`,
          sql`${quizAttempts.score} IS NULL`
        )
      );

    return Number(result?.count) || 0;
  }

  async countStudentPendingAssignments(studentId: number): Promise<number> {
    // Get all classes the student is enrolled in
    const enrollments = Array.from(this.enrollmentMap.values())
      .filter(enrollment => enrollment.studentId === studentId)
      .map(enrollment => enrollment.classId);

    // Count all assignments with due dates in the future
    const now = new Date();

    return Array.from(this.contentMap.values())
      .filter(content =>
        content.classId !== null &&
        enrollments.includes(content.classId) &&
        content.dueDate !== null &&
        content.dueDate > now
      )
      .length;
  }

  async getTeacherUpcomingDeadlines(teacherId: number, limit: number): Promise<Content[]> {
    // Find all classes where this teacher teaches
    const teacherClassSubjects = Array.from(this.classSubjectMap.values())
      .filter(cs => cs.teacherId === teacherId);

    // Get unique class IDs
    const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

    // Get upcoming deadlines
    const now = new Date();

    return Array.from(this.contentMap.values())
      .filter(content =>
        content.classId !== null &&
        classIds.includes(content.classId) &&
        content.dueDate !== null &&
        content.dueDate > now
      )
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      })
      .slice(0, limit);
  }

  async getStudentUpcomingDeadlines(studentId: number, limit: number): Promise<Content[]> {
    // Get all classes the student is enrolled in
    const enrollments = Array.from(this.enrollmentMap.values())
      .filter(enrollment => enrollment.studentId === studentId)
      .map(enrollment => enrollment.classId);

    // Get upcoming deadlines
    const now = new Date();

    return Array.from(this.contentMap.values())
      .filter(content =>
        content.classId !== null &&
        enrollments.includes(content.classId) &&
        content.dueDate !== null &&
        content.dueDate > now
      )
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      })
      .slice(0, limit);
  }

  async getRecentActivities(limit: number): Promise<any[]> {
    // For a real app, we would have an activities table
    // This is a simplified version that gets recent content and quiz attempts
    const recentContents = Array.from(this.contentMap.values())
      .map(content => ({
        id: content.id,
        type: 'content',
        title: content.title,
        contentType: content.contentType,
        userId: content.authorId,
        createdAt: content.createdAt
      }));

    const recentAttempts = Array.from(this.attemptMap.values())
      .map(attempt => ({
        id: attempt.id,
        type: 'attempt',
        title: 'Quiz Attempt',
        contentType: 'quiz',
        userId: attempt.studentId,
        createdAt: attempt.startedAt
      }));

    // Combine and sort by creation date
    return [...recentContents, ...recentAttempts]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Student document operations
  async addStudentDocument(document: InsertStudentDocument): Promise<StudentDocument> {
    const id = this.currentId.studentDocuments++;
    const newDocument: StudentDocument = {
      ...document,
      id,
      uploadedAt: new Date()
    };
    this.studentDocumentMap.set(id, newDocument);
    return newDocument;
  }

  async getStudentDocuments(studentId: number): Promise<StudentDocument[]> {
    return Array.from(this.studentDocumentMap.values())
      .filter(doc => doc.studentId === studentId);
  }

  async getStudentDocument(documentId: number): Promise<StudentDocument | undefined> {
    return this.studentDocumentMap.get(documentId);
  }

  async deleteStudentDocument(documentId: number): Promise<void> {
    this.studentDocumentMap.delete(documentId);
  }

  async deleteUser(userId: number): Promise<void> {
    this.userMap.delete(userId);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any here as session.SessionStore is not exported

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Set default values for new fields
    const userWithDefaults = {
      ...userData,
      profileImage: userData.profileImage || null,
      grade: userData.grade || null,
      section: userData.section || null,
      experienceLevel: userData.experienceLevel || null,
      bio: userData.bio || null,
      joinedAt: new Date()
    };

    const [user] = await db.insert(users).values(userWithDefaults).returning();
    return user;
  }

  // Update user profile
  async updateUserProfile(userId: number, data: Partial<User>): Promise<User> {
    try {
      // Process date fields to ensure proper format for PostgreSQL
      const processedData = { ...data };

      // Handle admissionDate specifically (now in dd/mm/yyyy format)
      if (processedData.admissionDate !== undefined) {
        if (processedData.admissionDate === null) {
          // Keep null as is
        } else if (typeof processedData.admissionDate === 'string') {
          // If it's a string in dd/mm/yyyy format, parse it
          try {
            // Parse dd/mm/yyyy format
            const [day, month, year] = processedData.admissionDate.split('/').map(Number);
            // Convert to a proper Date object, note that JS months are 0-indexed
            const parsedDate = new Date(year, month-1, day);

            if (isNaN(parsedDate.getTime())) {
              throw new Error('Invalid date');
            }

            // Store the date object directly
            processedData.admissionDate = parsedDate;
            console.log("Processed admissionDate from dd/mm/yyyy:", processedData.admissionDate);
          } catch (e) {
            console.error("Error parsing date string:", e, processedData.admissionDate);
            processedData.admissionDate = null; // Set to null if parsing fails
          }
        } else if (!(processedData.admissionDate instanceof Date)) {
          // If not a Date object and not a string, set to null
          console.warn("admissionDate is not a Date object or string:", processedData.admissionDate);
          processedData.admissionDate = null;
        }
      }

      // Log the final data being used for the update
      console.log("Final data for DB update:", JSON.stringify(processedData, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2));

      const [updatedUser] = await db
        .update(users)
        .set(processedData)
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // Teacher qualifications
  async createTeacherQualification(qualification: InsertTeacherQualification): Promise<TeacherQualification> {
    try {
      const [result] = await db
        .insert(teacherQualifications)
        .values(qualification)
        .returning();

      return result;
    } catch (error) {
      console.error("Error creating teacher qualification:", error);
      throw error;
    }
  }

  async getTeacherQualifications(teacherId: number): Promise<TeacherQualification[]> {
    try {
      return await db
        .select()
        .from(teacherQualifications)
        .where(eq(teacherQualifications.teacherId, teacherId))
        .orderBy(desc(teacherQualifications.year));
    } catch (error) {
      console.error("Error fetching teacher qualifications:", error);
      return [];
    }
  }

  async getTeacherQualification(id: number): Promise<TeacherQualification | undefined> {
    try {
      const [qualification] = await db
        .select()
        .from(teacherQualifications)
        .where(eq(teacherQualifications.id, id));

      return qualification;
    } catch (error) {
      console.error("Error fetching teacher qualification:", error);
      return undefined;
    }
  }

  async deleteTeacherQualification(id: number): Promise<void> {
    try {
      await db
        .delete(teacherQualifications)
        .where(eq(teacherQualifications.id, id));
    } catch (error) {
      console.error("Error deleting teacher qualification:", error);
      throw error;
    }
  }

  // Teacher subjects
  async createTeacherSubject(teacherSubject: InsertTeacherSubject): Promise<TeacherSubject> {
    try {
      const [result] = await db
        .insert(teacherSubjects)
        .values(teacherSubject)
        .returning();

      return result;
    } catch (error) {
      console.error("Error creating teacher subject:", error);
      throw error;
    }
  }

  async getTeacherSubjects(teacherId: number): Promise<(TeacherSubject & { subject: Subject })[]> {
    try {
      const results = await db
        .select({
          id: teacherSubjects.id,
          teacherId: teacherSubjects.teacherId,
          subjectId: teacherSubjects.subjectId,
          subject: subjects
        })
        .from(teacherSubjects)
        .innerJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
        .where(eq(teacherSubjects.teacherId, teacherId));

      return results;
    } catch (error) {
      console.error("Error fetching teacher subjects:", error);
      return [];
    }
  }

  async getTeacherSubject(id: number): Promise<TeacherSubject | undefined> {
    try {
      const [subject] = await db
        .select()
        .from(teacherSubjects)
        .where(eq(teacherSubjects.id, id));

      return subject;
    } catch (error) {
      console.error("Error fetching teacher subject:", error);
      return undefined;
    }
  }

  async deleteTeacherSubject(id: number): Promise<void> {
    try {
      await db
        .delete(teacherSubjects)
        .where(eq(teacherSubjects.id, id));
    } catch (error) {
      console.error("Error deleting teacher subject:", error);
      throw error;
    }
  }

  async countTeacherSubjects(teacherId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(teacherSubjects)
        .where(eq(teacherSubjects.teacherId, teacherId));

      return result[0].count;
    } catch (error) {
      console.error("Error counting teacher subjects:", error);
      return 0;
    }
  }

  // Get teacher with all details
  async getTeacherWithDetails(teacherId: number): Promise<TeacherWithDetails | undefined> {
    try {
      console.log(`getTeacherWithDetails: Fetching details for teacher ${teacherId}`);

      // Get the basic user information
      const teacher = await this.getUser(teacherId);
      if (!teacher) {
        console.log(`Teacher with ID ${teacherId} not found in users table`);
        return undefined;
      }

      if (teacher.role !== 'teacher') {
        console.log(`User ${teacherId} is not a teacher (role: ${teacher.role})`);
        return undefined;
      }

      console.log(`Found teacher ${teacherId} in users table:`, teacher.name);

      // Fetch qualifications and subjects in parallel
      console.log(`Fetching qualifications and subjects for teacher ${teacherId}`);
      const [qualifications, subjects] = await Promise.all([
        this.getTeacherQualifications(teacherId),
        this.getTeacherSubjects(teacherId)
      ]);

      console.log(`Found ${qualifications.length} qualifications and ${subjects.length} subjects for teacher ${teacherId}`);

      // Get classes taught by this teacher
      console.log(`Fetching classes for teacher ${teacherId}`);
      const classes = await this.getTeacherClasses(teacherId);
      console.log(`Found ${classes.length} classes for teacher ${teacherId}`);

      // Get content created by this teacher
      console.log(`Fetching content created by teacher ${teacherId}`);
      const contentCount = await this.countTeacherContents(teacherId);
      console.log(`Found ${contentCount} content items created by teacher ${teacherId}`);

      // Combine all the data
      const teacherWithDetails: TeacherWithDetails = {
        ...teacher,
        qualifications,
        subjects,
        classes,
        contentCount
      };

      console.log(`Successfully compiled details for teacher ${teacherId}`);
      return teacherWithDetails;
    } catch (error) {
      console.error(`Error fetching teacher details for ${teacherId}:`, error);
      return undefined;
    }
  }

  // Student enrollment
  async assignStudentToClass(studentId: number, classId: number): Promise<ClassEnrollment> {
    try {
      // Check if student is already enrolled in this class
      const existingEnrollments = await db
        .select()
        .from(classEnrollments)
        .where(and(
          eq(classEnrollments.studentId, studentId),
          eq(classEnrollments.classId, classId)
        ));

      if (existingEnrollments.length > 0) {
        return existingEnrollments[0];
      }

      // Create new enrollment
      const [enrollment] = await db
        .insert(classEnrollments)
        .values({ studentId, classId })
        .returning();

      return enrollment;
    } catch (error) {
      console.error("Error assigning student to class:", error);
      throw error;
    }
  }

  // Get student with details
  async getStudentWithDetails(studentId: number): Promise<StudentWithDetails | undefined> {
    try {
      const student = await this.getUser(studentId);
      if (!student || student.role !== 'student') {
        return undefined;
      }

      const enrolledClasses = await this.getStudentClasses(studentId);
      const completedQuizzes = await this.countStudentCompletedQuizzes(studentId);
      const totalQuizzes = await this.countStudentTotalQuizzes(studentId);
      const averageScore = await this.getStudentAverageScore(studentId);
      const documents = await this.getStudentDocuments(studentId);

      // Now that we have a proper column in the database, we can just use it directly
      return {
        ...student,
        enrolledClasses,
        completedQuizzes,
        totalQuizzes,
        averageScore,
        documents,
        // The mobileNumber is already part of the student object, no need for additional handling
        mobileNumber: student.mobileNumber
      };
    } catch (error) {
      console.error("Error fetching student details:", error);
      return undefined;
    }
  }

  async getUsers(role?: string): Promise<User[]> {
    if (role) {
      return await db.select().from(users).where(eq(users.role, role as any));
    }
    return await db.select().from(users);
  }

  async countUsers(role?: string): Promise<number> {
    if (role) {
      const [result] = await db.select({ count: count() }).from(users).where(eq(users.role, role as any));
      return Number(result?.count) || 0;
    }
    const [result] = await db.select({ count: count() }).from(users);
    return Number(result?.count) || 0;
  }

  async getRecentUsers(limit: number): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.id)).limit(limit);
  }

  // Subject operations
  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [createdSubject] = await db.insert(subjects).values(subject).returning();
    return createdSubject;
  }

  async getAllSubjects(): Promise<Subject[]> {
    try {
      console.log("Starting to fetch all subjects...");

      // First check if we can connect to the database
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.error("Cannot fetch subjects: Database connection failed");
        return [];
      }

      console.log("Database connection successful, querying subjects table...");
      const result = await db.select().from(subjects);

      if (!result || result.length === 0) {
        console.log("No subjects found in database");
        return [];
      }

      // Log each subject for debugging
      result.forEach(subject => {
        console.log(`Found subject: ${subject.name} (ID: ${subject.id})`);
      });

      console.log(`Successfully fetched ${result.length} subjects`);
      return result;
    } catch (error) {
      console.error("Error in getAllSubjects:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return [];
    }
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async getSubjectsWithClassCount(): Promise<(Subject & { classCount: number })[]> {
    try {
      console.log("Starting to fetch subjects with class counts...");

      // First check database connection
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.error("Cannot fetch subjects: Database connection failed");
        return [];
      }

      // First get all subjects
      const allSubjects = await db.select().from(subjects);
      console.log("Fetched all subjects:", allSubjects);

      // Then get class counts for each subject
      const classCounts = await db
        .select({
          subjectId: classSubjects.subjectId,
          count: sql<number>`COUNT(DISTINCT ${classSubjects.classId})::int`
        })
        .from(classSubjects)
        .groupBy(classSubjects.subjectId);

      console.log("Fetched class counts:", classCounts);

      // Create a map of subject IDs to their class counts
      const classCountMap = new Map(
        classCounts.map(item => [item.subjectId, item.count])
      );

      // Combine the data, defaulting to 0 for subjects without classes
      const result = allSubjects.map(subject => ({
        ...subject,
        classCount: classCountMap.get(subject.id) || 0
      }));

      console.log("Final subjects with counts:", result);
      return result;
    } catch (error: unknown) {
      console.error("Error fetching subjects with class counts:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
      return [];
    }
  }

  // Class operations
  async createClass(classData: InsertClass): Promise<Class> {
    const [createdClass] = await db.insert(classes).values({
      ...classData,
      // Ensure null values instead of undefined for these fields
      description: classData.description ?? null,
      section: classData.section ?? null
    }).returning();
    return createdClass;
  }

  async updateClass(id: number, data: Partial<Class>): Promise<Class> {
    const [updatedClass] = await db.update(classes)
      .set(data)
      .where(eq(classes.id, id))
      .returning();

    if (!updatedClass) {
      throw new Error("Class not found or update failed");
    }

    return updatedClass;
  }

  async getAllClasses(): Promise<Class[]> {
    const result = await db.select().from(classes);

    // For each class, get the subjects and students
    for (const classItem of result) {
      // Get class subjects and students
      const subjects = await this.getClassSubjects(classItem.id);
      const students = await this.getClassStudents(classItem.id);

      // Add these as custom properties
      (classItem as any).subjects = subjects;
      (classItem as any).students = students;
    }

    return result;
  }

  private async getClassSubjects(classId: number): Promise<ClassSubjectWithDetails[]> {
    const result = await db
      .select({
        id: classSubjects.id,
        classId: classSubjects.classId,
        subjectId: classSubjects.subjectId,
        teacherId: classSubjects.teacherId,
        subject: subjects,
        teacher: users
      })
      .from(classSubjects)
      .leftJoin(subjects, eq(classSubjects.subjectId, subjects.id))
      .leftJoin(users, eq(classSubjects.teacherId, users.id))
      .where(eq(classSubjects.classId, classId));

    return result.map(item => ({
      ...item,
      subject: item.subject,
      teacher: item.teacher
    }));
  }

  private async getClassStudents(classId: number): Promise<User[]> {
    // First get students directly enrolled in the class
    const enrollments = await db
      .select({
        studentId: classEnrollments.studentId,
        student: users
      })
      .from(classEnrollments)
      .leftJoin(users, eq(classEnrollments.studentId, users.id))
      .where(eq(classEnrollments.classId, classId));

    const enrolledStudents = enrollments.map(e => e.student).filter(Boolean);

    // Then get the class details to find grade and section
    const [classItem] = await db.select().from(classes).where(eq(classes.id, classId));

    if (classItem && classItem.grade) {
      // Get all students who match the grade and section
      const gradeStudents = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "student"),
            eq(users.grade, classItem.grade),
            classItem.section ? eq(users.section, classItem.section) : undefined
          )
        );

      // Combine the two lists, removing duplicates by ID
      const allStudents = [...enrolledStudents];
      const enrolledIds = new Set(enrolledStudents.map(s => s.id));

      for (const student of gradeStudents) {
        if (!enrolledIds.has(student.id)) {
          allStudents.push(student);
        }
      }

      return allStudents;
    }

    return enrolledStudents;
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [classItem] = await db.select().from(classes).where(eq(classes.id, id));
    return classItem;
  }

  async getClassWithDetails(id: number): Promise<ClassWithDetails | undefined> {
    const [classItem] = await db.select().from(classes).where(eq(classes.id, id));
    if (!classItem) return undefined;

    const subjects = await this.getClassSubjects(id);
    const students = await this.getClassStudents(id);

    const classContents = await db
      .select()
      .from(contents)
      .where(eq(contents.classId, id));

    return {
      ...classItem,
      subjects,
      students,
      contents: classContents
    };
  }

  async countClasses(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(classes);
    return Number(result?.count) || 0;
  }

  // Class Subject operations
  async createClassSubject(data: InsertClassSubject): Promise<ClassSubject> {
    const [result] = await db.insert(classSubjects).values(data).returning();
    return result;
  }

  async deleteClassSubject(id: number): Promise<void> {
    await db.delete(classSubjects).where(eq(classSubjects.id, id));
  }

  // Class enrollment operations
  async createEnrollment(enrollment: InsertClassEnrollment): Promise<ClassEnrollment> {
    const [result] = await db.insert(classEnrollments).values(enrollment).returning();
    return result;
  }

  async getStudentClasses(studentId: number): Promise<ClassWithDetails[]> {
    const enrollments = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.studentId, studentId));

    const result: ClassWithDetails[] = [];

    for (const enrollment of enrollments) {
      const classWithDetails = await this.getClassWithDetails(enrollment.classId);
      if (classWithDetails) {
        result.push(classWithDetails);
      }
    }

    return result;
  }

  async getTeacherClasses(teacherId: number): Promise<ClassWithDetails[]> {
    // Find all classes where this teacher teaches at least one subject
    const teacherClassSubjects = await db
      .select()
      .from(classSubjects)
      .where(eq(classSubjects.teacherId, teacherId));

    // Get unique class IDs
    const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

    console.log(`Found ${classIds.length} class IDs for teacher ${teacherId}:`, classIds);

    const result: ClassWithDetails[] = [];

    for (const classId of classIds) {
      const classWithDetails = await this.getClassWithDetails(classId);
      if (classWithDetails) {
        result.push(classWithDetails);
      }
    }

    console.log(`Found ${result.length} classes with details for teacher ${teacherId}`);

    return result;
  }

  async countTeacherStudents(teacherId: number): Promise<number> {
    // Find all classes where this teacher teaches
    const teacherClassSubjects = await db
      .select()
      .from(classSubjects)
      .where(eq(classSubjects.teacherId, teacherId));

    // Get unique class IDs
    const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

    if (classIds.length === 0) return 0;

    // Count all unique students enrolled in these classes
    const enrollments = await db
      .select()
      .from(classEnrollments)
      .where(inArray(classEnrollments.classId, classIds));

    // Count unique student IDs
    const uniqueStudentIds = new Set(enrollments.map(e => e.studentId));
    return uniqueStudentIds.size;
  }

  // Content operations
  async createContent(content: InsertContent): Promise<Content> {
    const [result] = await db.insert(contents).values({
      ...content,
      createdAt: new Date(),
      description: content.description ?? null,
      classId: content.classId ?? null,
      fileUrl: content.fileUrl ?? null,
      dueDate: content.dueDate ?? null
    }).returning();
    return result;
  }

  async getContents(contentType?: string, classId?: number, subjectId?: number, authorId?: number): Promise<ContentWithDetails[]> {
    console.log(`getContents called with params: contentType=${contentType}, classId=${classId}, subjectId=${subjectId}, authorId=${authorId}`);

    let query = db
      .select({
        content: contents,
        author: users,
        class: classes,
        subject: subjects
      })
      .from(contents)
      .leftJoin(users, eq(contents.authorId, users.id))
      .leftJoin(classes, eq(contents.classId, classes.id))
      .leftJoin(subjects, eq(contents.subjectId, subjects.id));

    const conditions = [];

    if (contentType) {
      console.log(`Adding contentType filter: ${contentType}`);
      conditions.push(eq(contents.contentType, contentType as any));
    }

    if (classId !== undefined) {
      console.log(`Adding classId filter: ${classId}`);
      conditions.push(eq(contents.classId, classId));
    }

    if (subjectId !== undefined) {
      console.log(`Adding subjectId filter: ${subjectId}`);
      conditions.push(eq(contents.subjectId, subjectId));
    }

    if (authorId !== undefined) {
      console.log(`Adding authorId filter: ${authorId}`);
      conditions.push(eq(contents.authorId, authorId));
    }

    // Apply all conditions if there are any
    if (conditions.length > 0) {
      console.log(`Applying ${conditions.length} filter conditions`);
      query = query.where(and(...conditions));
    }

    console.log("Executing database query for contents");
    const results = await query;
    console.log(`Query returned ${results.length} content items`);

    // Map the results to include author, class, and subject details
    const mappedResults = results.map(result => {
      // Remove password from author for security
      const author = result.author ? {
        ...result.author,
        password: undefined
      } : undefined;

      return {
        ...result.content,
        author,
        class: result.class,
        subject: result.subject
      };
    });

    console.log(`Returning ${mappedResults.length} content items with details`);
    return mappedResults;
  }

  async getContent(id: number): Promise<Content | undefined> {
    const [content] = await db.select().from(contents).where(eq(contents.id, id));
    return content;
  }

  async updateContent(id: number, data: Partial<Content>): Promise<Content> {
    try {
      console.log("Updating content with ID:", id);

      // Convert "active" status to "published" for consistency
      if (data.status === "active") {
        console.log("Converting 'active' status to 'published'");
        data.status = "published";
      }

      // Create a clean update object without the dueDate field
      const { dueDate, ...otherData } = data;

      // Log the data
      console.log("Due date from request:", dueDate);
      console.log("Other data:", otherData);

      // Use a direct SQL query to update the content
      // This bypasses any ORM issues with date handling
      let query = `
        UPDATE contents
        SET
      `;

      // Build the SET clause for other fields
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      // Add each field to the SET clause
      for (const [key, value] of Object.entries(otherData)) {
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
        setClauses.push(`"${dbColumnName}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      // Handle the due date separately
      if (dueDate === null || dueDate === undefined || dueDate === "") {
        setClauses.push(`"due_date" = NULL`);
      } else {
        // Parse the date string if it's in ISO format (from datetime-local input)
        let dateValue = dueDate;
        if (typeof dueDate === 'string' && dueDate.includes('T')) {
          try {
            dateValue = new Date(dueDate);
            console.log("Parsed due date from string:", dateValue);
          } catch (error) {
            console.error("Error parsing due date:", error);
          }
        }
        setClauses.push(`"due_date" = $${paramIndex}::timestamp`);
        values.push(dateValue);
        paramIndex++;
      }

      // Complete the query
      query += setClauses.join(", ");
      query += ` WHERE id = $${paramIndex} RETURNING *`;
      values.push(id);

      console.log("SQL Query:", query);
      console.log("SQL Values:", values);

      // Execute the query using the pool
      const client = await pool.connect();
      try {
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
          throw new Error("Content not found");
        }

        const updated = result.rows[0];
        console.log("Content updated successfully:", updated);
        return updated;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating content:", error);
      throw error;
    }
  }

  async deleteContent(id: number): Promise<void> {
    // First check if the content exists
    const [content] = await db.select().from(contents).where(eq(contents.id, id));

    if (!content) {
      throw new Error("Content not found");
    }

    // If it's a quiz content, delete associated quiz and questions
    if (content.contentType === 'quiz') {
      // Find the quiz
      const [quiz] = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.contentId, id));

      if (quiz) {
        // Delete questions
        await db
          .delete(questions)
          .where(eq(questions.quizId, quiz.id));

        // Delete quiz attempts
        await db
          .delete(quizAttempts)
          .where(eq(quizAttempts.quizId, quiz.id));

        // Delete quiz
        await db
          .delete(quizzes)
          .where(eq(quizzes.id, quiz.id));
      }
    }

    // Finally delete the content
    await db
      .delete(contents)
      .where(eq(contents.id, id));
  }

  async countTeacherContents(teacherId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(contents)
      .where(eq(contents.authorId, teacherId));
    return Number(result?.count) || 0;
  }

  async countTeacherClassesContents(teacherId: number): Promise<number> {
    try {
      // Find all classes where this teacher teaches
      const teacherClassSubjects = await db
        .select()
        .from(classSubjects)
        .where(eq(classSubjects.teacherId, teacherId));

      // Get unique class IDs
      const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

      if (classIds.length === 0) return 0;

      // Count all content in these classes
      const [result] = await db
        .select({ count: count() })
        .from(contents)
        .where(inArray(contents.classId, classIds));

      return Number(result?.count) || 0;
    } catch (error) {
      console.error("Error counting teacher classes content:", error);
      return 0;
    }
  }

  async countContents(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(contents);
    return Number(result?.count) || 0;
  }

  // Quiz operations
  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [result] = await db.insert(quizzes).values({
      ...quiz,
      timeLimit: quiz.timeLimit ?? null,
      passingScore: quiz.passingScore ?? null
    }).returning();
    return result;
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async updateQuiz(id: number, data: Partial<Quiz>): Promise<Quiz> {
    console.log(`Updating quiz with ID ${id} with data:`, data);

    try {
      const [result] = await db
        .update(quizzes)
        .set(data)
        .where(eq(quizzes.id, id))
        .returning();

      console.log("Quiz updated successfully:", result);
      return result;
    } catch (error) {
      console.error("Error updating quiz:", error);
      throw error;
    }
  }

  async getQuizzes(classId?: number, subjectId?: number, authorId?: number): Promise<Quiz[]> {
    console.log(`getQuizzes called with classId=${classId}, subjectId=${subjectId}, authorId=${authorId}`);

    try {
      // First, query the contents table to find quizzes
      let contentQuery = db.select().from(contents)
        .where(eq(contents.contentType, 'quiz' as any));

      // Apply filters based on class, subject, and author
      const contentConditions = [];
      if (classId !== undefined) {
        contentConditions.push(eq(contents.classId, classId));
      }
      if (subjectId !== undefined) {
        contentConditions.push(eq(contents.subjectId, subjectId));
      }
      if (authorId !== undefined) {
        contentConditions.push(eq(contents.authorId, authorId));
      }

      // Add conditions to the content query
      if (contentConditions.length > 0) {
        contentQuery = contentQuery.where(and(...contentConditions));
      }

      // Get the content records
      const contentRecords = await contentQuery;
      console.log(`Found ${contentRecords.length} quiz content records`);

      // If no content records found, return empty array
      if (contentRecords.length === 0) {
        console.log("No quiz content records found, returning empty array");
        return [];
      }

      // Get the content IDs to find the quizzes
      const contentIds = contentRecords.map(content => content.id);
      console.log(`Content IDs: ${contentIds.join(', ')}`);

      // Query the quizzes based on content IDs
      const quizRecords = await db.select()
        .from(quizzes)
        .where(inArray(quizzes.contentId, contentIds));

      console.log(`Found ${quizRecords.length} quiz records`);

      // Combine the content and quiz data
      const result = quizRecords.map(quiz => {
        const content = contentRecords.find(c => c.id === quiz.contentId);
        if (!content) {
          console.error(`Content not found for quiz ${quiz.id}`);
          return null;
        }

        // Return a combined object that matches the Quiz type
        return {
          ...quiz,
          title: content.title,
          description: content.description,
          classId: content.classId,
          subjectId: content.subjectId,
          authorId: content.authorId,
          status: content.status || 'draft',
          createdAt: content.createdAt,
          dueDate: content.dueDate
        } as Quiz;
      }).filter(Boolean) as Quiz[];

      console.log(`Returning ${result.length} combined quizzes`);

      if (result.length > 0) {
        console.log("Sample quiz:", {
          id: result[0].id,
          title: result[0].title,
          authorId: result[0].authorId,
          classId: result[0].classId,
          subjectId: result[0].subjectId
        });
      }

      return result;
    } catch (error) {
      console.error("Error in getQuizzes:", error);
      return [];
    }
  }

  async getQuizzesByClasses(classIds: number[]): Promise<Quiz[]> {
    if (!classIds || classIds.length === 0) {
      console.log("No class IDs provided to getQuizzesByClasses");
      return [];
    }

    console.log(`getQuizzesByClasses: Fetching quizzes for classes: ${classIds.join(', ')}`);

    try {
      // First, query the contents table to find quizzes for these classes
      const contentQuery = db.select().from(contents)
        .where(
          and(
            eq(contents.contentType, 'quiz' as any),
            inArray(contents.classId, classIds)
          )
        );

      const contentResults = await contentQuery;
      console.log(`Found ${contentResults.length} quiz contents for the specified classes`);

      if (contentResults.length === 0) {
        return [];
      }

      const contentIds = contentResults.map(c => c.id);

      // Then, get the quiz data for these content IDs
      const quizResults = await db
        .select()
        .from(quizzes)
        .where(inArray(quizzes.contentId, contentIds));

      console.log(`Found ${quizResults.length} quizzes for the specified classes`);

      if (quizResults.length === 0) {
        return [];
      }

      // Combine the data
      const result = quizResults.map(quiz => {
        const content = contentResults.find(c => c.id === quiz.contentId);
        if (!content) {
          console.error(`Content not found for quiz ${quiz.id}`);
          return null;
        }

        return {
          ...quiz,
          title: content.title,
          description: content.description,
          classId: content.classId,
          subjectId: content.subjectId,
          authorId: content.authorId,
          status: content.status || 'draft',
          createdAt: content.createdAt,
          dueDate: content.dueDate
        } as Quiz;
      }).filter(Boolean) as Quiz[];

      console.log(`Returning ${result.length} combined quizzes`);
      return result;
    } catch (error) {
      console.error("Error in getQuizzesByClasses:", error);
      return [];
    }
  }

  async getQuizWithQuestions(id: number): Promise<QuizWithQuestions | undefined> {
    console.log(`Getting quiz with questions for ID: ${id}`);

    let quiz;
    let content;

    // First, check if this is a content ID
    [content] = await db.select().from(contents).where(
      and(
        eq(contents.id, id),
        eq(contents.contentType, 'quiz' as any)
      )
    );

    if (content) {
      console.log(`Found content with ID ${id}, looking for associated quiz`);
      const quizResults = await db.select().from(quizzes).where(eq(quizzes.contentId, content.id));
      if (quizResults.length > 0) {
        quiz = quizResults[0];
        console.log(`Found quiz with ID ${quiz.id} for content ID ${content.id}`);
      } else {
        console.log(`No quiz found for content ID ${content.id}`);
      }
    } else {
      // If not a content ID, try to find the quiz directly by its ID
      console.log(`Content not found with ID ${id}, checking if it's a quiz ID`);
      [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));

      if (quiz) {
        console.log(`Found quiz with ID ${id}, looking for associated content`);
        [content] = await db.select().from(contents).where(eq(contents.id, quiz.contentId));
      }
    }

    // If we still don't have both quiz and content, return undefined
    if (!quiz || !content) {
      console.log(`Quiz or content not found for ID ${id}`);
      return undefined;
    }

    console.log(`Successfully found quiz with ID ${quiz.id} and content ID ${content.id}`);

    // Get all questions for this quiz
    const questionsList = await db.select().from(questions).where(eq(questions.quizId, quiz.id));

    // Process questions to ensure options are properly formatted
    const processedQuestions = questionsList.map(question => {
      // Make sure options is an array
      let options = question.options;

      // If options is a string, try to parse it as JSON
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
          console.log(`Parsed options for question ${question.id}:`, options);
        } catch (e) {
          console.error(`Failed to parse options for question ${question.id}:`, e);
          // If parsing fails, create a default set of options
          options = [
            { text: "Option A (Sample)", isCorrect: true },
            { text: "Option B (Sample)", isCorrect: false },
            { text: "Option C (Sample)", isCorrect: false },
            { text: "Option D (Sample)", isCorrect: false }
          ];
        }
      }

      // If options is still not an array or is empty, create default options
      if (!Array.isArray(options) || options.length === 0) {
        console.log(`Creating default options for question ${question.id}`);
        options = [
          { text: "Option A (Sample)", isCorrect: true },
          { text: "Option B (Sample)", isCorrect: false },
          { text: "Option C (Sample)", isCorrect: false },
          { text: "Option D (Sample)", isCorrect: false }
        ];
      }

      return {
        ...question,
        options
      };
    });

    // Get class and subject details
    const [classObj] = content.classId
      ? await db.select().from(classes).where(eq(classes.id, content.classId))
      : [undefined];

    const [subject] = content.subjectId
      ? await db.select().from(subjects).where(eq(subjects.id, content.subjectId))
      : [undefined];

    const [author] = content.authorId
      ? await db.select().from(users).where(eq(users.id, content.authorId))
      : [undefined];

    // Create a complete object that matches the QuizWithQuestions type
    // Log the quiz object to see what fields it contains
    console.log("Quiz object from database:", quiz);

    return {
      ...quiz,
      title: content.title,
      description: content.description,
      classId: content.classId,
      subjectId: content.subjectId,
      authorId: content.authorId,
      status: content.status || 'draft',
      createdAt: content.createdAt,
      dueDate: content.dueDate, // Add the due date from the content
      timeLimit: quiz.timeLimit, // Ensure timeLimit is included
      passingScore: quiz.passingScore, // Ensure passingScore is included
      totalPoints: quiz.totalPoints, // Ensure totalPoints is included
      class: classObj,
      subject,
      author: author ? { ...author, password: undefined } : undefined,
      questions: processedQuestions // Use the processed questions with fixed options
    } as QuizWithQuestions;
  }

  async countQuizzes(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(quizzes);
    return Number(result?.count) || 0;
  }

  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [result] = await db.insert(questions).values(question).returning();
    return result;
  }

  async getQuestions(quizId: number): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.quizId, quizId));
  }

  async updateQuestion(id: number, data: Partial<Question>): Promise<Question> {
    console.log(`Updating question with ID ${id} with data:`, data);

    try {
      const [result] = await db
        .update(questions)
        .set(data)
        .where(eq(questions.id, id))
        .returning();

      console.log("Question updated successfully:", result);
      return result;
    } catch (error) {
      console.error("Error updating question:", error);
      throw error;
    }
  }

  // Quiz attempt operations
  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    console.log(`Creating quiz attempt with data:`, attempt);

    try {
      // Check if the quizId is actually a content ID
      if (attempt.quizId) {
        // First, try to find a quiz with this ID
        const [quizCheck] = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId));

        // If no quiz found with this ID, it might be a content ID
        if (!quizCheck) {
          console.log(`No quiz found with ID ${attempt.quizId}, checking if it's a content ID`);

          // Look for content with this ID
          const [content] = await db.select().from(contents).where(
            and(
              eq(contents.id, attempt.quizId),
              eq(contents.contentType, 'quiz' as any)
            )
          );

          if (content) {
            console.log(`Found content with ID ${content.id}, looking for associated quiz`);

            // Find the quiz associated with this content
            const [quiz] = await db.select().from(quizzes).where(eq(quizzes.contentId, content.id));

            if (quiz) {
              console.log(`Found quiz with ID ${quiz.id} for content ID ${content.id}`);
              // Update the attempt to use the actual quiz ID
              attempt.quizId = quiz.id;
            } else {
              console.error(`No quiz found for content ID ${content.id}`);
              throw new Error(`No quiz found for content ID ${content.id}`);
            }
          } else {
            console.error(`No content found with ID ${attempt.quizId}`);
            throw new Error(`No content found with ID ${attempt.quizId}`);
          }
        }
      }

      console.log(`Inserting quiz attempt with quiz ID ${attempt.quizId}`);

      // Now create the attempt with the correct quiz ID
      const [result] = await db.insert(quizAttempts).values({
        ...attempt,
        startedAt: new Date()
      }).returning();

      console.log(`Quiz attempt created successfully with ID ${result.id}`);
      return result;
    } catch (error) {
      console.error(`Error creating quiz attempt:`, error);
      throw error;
    }
  }

  async updateQuizAttempt(id: number, data: Partial<QuizAttempt>): Promise<QuizAttempt> {
    const [result] = await db
      .update(quizAttempts)
      .set(data)
      .where(eq(quizAttempts.id, id))
      .returning();

    return result;
  }

  async countStudentCompletedQuizzes(studentId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          sql`${quizAttempts.completedAt} IS NOT NULL`
        )
      );
    return Number(result?.count) || 0;
  }

  async countStudentTotalQuizzes(studentId: number): Promise<number> {
    // Get all classes the student is enrolled in
    const enrollments = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.studentId, studentId));

    const classIds = enrollments.map(e => e.classId);

    if (classIds.length === 0) return 0;

    // Count all quizzes in those classes
    const [result] = await db
      .select({ count: count() })
      .from(contents)
      .where(
        and(
          eq(contents.contentType, 'quiz' as any),
          inArray(contents.classId, classIds)
        )
      );

    return Number(result?.count) || 0;
  }

  async getStudentAverageScore(studentId: number): Promise<number> {
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          sql`${quizAttempts.score} IS NOT NULL`
        )
      );

    if (attempts.length === 0) return 0;

    const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
    return Math.round((totalScore / attempts.length) * 100) / 100;
  }

  // Dashboard data
  async countPendingGrading(teacherId: number): Promise<number> {
    try {
      // Find all classes where this teacher teaches
      const teacherClassSubjects = await db
        .select()
        .from(classSubjects)
        .where(eq(classSubjects.teacherId, teacherId));

      // Get unique class IDs
      const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

      if (classIds.length === 0) return 0;

      // Find all quiz contents in these classes
      const quizContents = await db
        .select()
        .from(contents)
        .where(
          and(
            eq(contents.contentType, 'quiz' as any),
            inArray(contents.classId, classIds)
          )
        );

      const contentIds = quizContents.map(c => c.id);

      if (contentIds.length === 0) return 0;

      // Find all quizzes for these contents
      const quizzesData = await db
        .select()
        .from(quizzes)
        .where(inArray(quizzes.contentId, contentIds));

      // Make sure we have quiz data before proceeding
      if (!quizzesData || quizzesData.length === 0) return 0;

      const quizIdArray = quizzesData.map(q => q.id);

      if (quizIdArray.length === 0) return 0;

      // Count all quiz attempts that need grading
      const [result] = await db
        .select({ count: count() })
        .from(quizAttempts)
        .where(
          and(
            inArray(quizAttempts.quizId, quizIdArray),
            sql`${quizAttempts.completedAt} IS NOT NULL`,
            sql`${quizAttempts.score} IS NULL`
          )
        );

      return Number(result?.count) || 0;
    } catch (error) {
      console.error("Error counting pending grading:", error);
      return 0;
    }
  }

  async countStudentPendingAssignments(studentId: number): Promise<number> {
    // Get all classes the student is enrolled in
    const enrollments = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.studentId, studentId));

    const classIds = enrollments.map(e => e.classId);

    if (classIds.length === 0) return 0;

    // Count all assignments with due dates in the future
    const now = new Date();

    const [result] = await db
      .select({ count: count() })
      .from(contents)
      .where(
        and(
          inArray(contents.classId, classIds),
          sql`${contents.dueDate} > ${now}`
        )
      );

    return Number(result?.count) || 0;
  }

  async getTeacherUpcomingDeadlines(teacherId: number, limit: number): Promise<Content[]> {
    // Find all classes where this teacher teaches
    const teacherClassSubjects = await db
      .select()
      .from(classSubjects)
      .where(eq(classSubjects.teacherId, teacherId));

    // Get unique class IDs
    const classIds = [...new Set(teacherClassSubjects.map(cs => cs.classId))];

    if (classIds.length === 0) return [];

    // Get upcoming deadlines
    const now = new Date();

    return await db
      .select()
      .from(contents)
      .where(
        and(
          inArray(contents.classId, classIds),
          sql`${contents.dueDate} > ${now}`
        )
      )
      .orderBy(asc(contents.dueDate))
      .limit(limit);
  }

  async getStudentUpcomingDeadlines(studentId: number, limit: number): Promise<Content[]> {
    // Get all classes the student is enrolled in
    const enrollments = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.studentId, studentId));

    const classIds = enrollments.map(e => e.classId);

    if (classIds.length === 0) return [];

    // Get upcoming deadlines
    const now = new Date();

    return await db
      .select()
      .from(contents)
      .where(
        and(
          inArray(contents.classId, classIds),
          sql`${contents.dueDate} > ${now}`
        )
      )
      .orderBy(asc(contents.dueDate))
      .limit(limit);
  }

  async getRecentActivities(limit: number): Promise<any[]> {
    // For a real app, we would have an activities table
    // This is a simplified version that gets recent content and quiz attempts
    const recentContents = await db
      .select({
        id: contents.id,
        type: sql<string>`'content'`,
        title: contents.title,
        contentType: contents.contentType,
        userId: contents.authorId,
        createdAt: contents.createdAt
      })
      .from(contents)
      .orderBy(desc(contents.createdAt))
      .limit(limit);

    const recentAttempts = await db
      .select({
        id: quizAttempts.id,
        type: sql<string>`'attempt'`,
        title: sql<string>`'Quiz Attempt'`,
        contentType: sql<string>`'quiz'`,
        userId: quizAttempts.studentId,
        createdAt: quizAttempts.startedAt
      })
      .from(quizAttempts)
      .orderBy(desc(quizAttempts.startedAt))
      .limit(limit);

    // Combine and sort by creation date
    return [...recentContents, ...recentAttempts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Student document operations
  async addStudentDocument(document: InsertStudentDocument): Promise<StudentDocument> {
    try {
      const [result] = await db
        .insert(studentDocuments)
        .values({
          ...document,
          uploadedAt: new Date()
        })
        .returning();

      return result;
    } catch (error) {
      console.error("Error adding student document:", error);
      throw error;
    }
  }

  async getStudentDocuments(studentId: number): Promise<StudentDocument[]> {
    try {
      return await db
        .select()
        .from(studentDocuments)
        .where(eq(studentDocuments.studentId, studentId))
        .orderBy(desc(studentDocuments.uploadedAt));
    } catch (error) {
      console.error("Error fetching student documents:", error);
      return [];
    }
  }

  async getStudentDocument(documentId: number): Promise<StudentDocument | undefined> {
    try {
      const [document] = await db
        .select()
        .from(studentDocuments)
        .where(eq(studentDocuments.id, documentId));

      return document;
    } catch (error) {
      console.error("Error fetching student document:", error);
      return undefined;
    }
  }

  async deleteStudentDocument(documentId: number): Promise<void> {
    try {
      await db
        .delete(studentDocuments)
        .where(eq(studentDocuments.id, documentId));
    } catch (error) {
      console.error("Error deleting student document:", error);
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }
}

// Create a single instance of DatabaseStorage
const storage = new DatabaseStorage();

// Export the storage instance
export { storage };