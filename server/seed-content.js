// This script seeds the database with initial content
import { pool, db } from './db.js';
import { contents, users, classes, subjects } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function seedContent() {
  try {
    console.log("Starting content seeding process...");

    // Check if we can connect to the database
    const client = await pool.connect();
    try {
      console.log("Database connection successful");

      // Get all teachers
      const teachers = await db.select().from(users).where(eq(users.role, 'teacher'));
      console.log(`Found ${teachers.length} teachers in database`);

      if (teachers.length === 0) {
        console.log("No teachers found. Cannot create content.");
        return;
      }

      // Get all classes
      const allClasses = await db.select().from(classes);
      console.log(`Found ${allClasses.length} classes in database`);

      if (allClasses.length === 0) {
        console.log("No classes found. Cannot create content.");
        return;
      }

      // Get all subjects
      const allSubjects = await db.select().from(subjects);
      console.log(`Found ${allSubjects.length} subjects in database`);

      if (allSubjects.length === 0) {
        console.log("No subjects found. Cannot create content.");
        return;
      }

      // Create sample content for each teacher
      for (const teacher of teachers) {
        console.log(`Creating content for teacher: ${teacher.name} (ID: ${teacher.id})`);

        // Create a note
        const note = {
          title: `Physics Notes - ${teacher.name}`,
          description: 'Comprehensive notes on mechanics and thermodynamics',
          contentType: 'note',
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/notes.pdf',
          status: 'active',
          createdAt: new Date()
        };

        // Create a homework
        const homework = {
          title: `Math Homework - ${teacher.name}`,
          description: 'Practice problems on calculus',
          contentType: 'homework',
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/homework.pdf',
          status: 'active',
          createdAt: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Due in 7 days
        };

        // Create a DPP
        const dpp = {
          title: `Chemistry DPP - ${teacher.name}`,
          description: 'Daily practice problems on organic chemistry',
          contentType: 'dpp',
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/dpp.pdf',
          status: 'active',
          createdAt: new Date(),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Due in 3 days
        };

        // Create a lecture
        const lecture = {
          title: `Biology Lecture - ${teacher.name}`,
          description: 'Video lecture on cell biology',
          contentType: 'lecture',
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/lecture.mp4',
          status: 'active',
          createdAt: new Date()
        };

        // Create a sample paper
        const samplePaper = {
          title: `English Sample Paper - ${teacher.name}`,
          description: 'Sample paper for final exam',
          contentType: 'sample_paper',
          authorId: teacher.id,
          classId: allClasses[0].id,
          subjectId: allSubjects[0].id,
          fileUrl: 'https://example.com/sample_paper.pdf',
          status: 'active',
          createdAt: new Date()
        };

        // Insert all content
        try {
          await db.insert(contents).values(note);
          await db.insert(contents).values(homework);
          await db.insert(contents).values(dpp);
          await db.insert(contents).values(lecture);
          await db.insert(contents).values(samplePaper);
          console.log(`Created 5 content items for teacher ${teacher.name}`);
        } catch (error) {
          console.error('Error creating content:', error);
        }
      }

      console.log("Content seeding completed successfully");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Content seeding failed:", error);
  }
}

// Run the seeding process
seedContent().then(() => {
  console.log("Seeding completed");
  process.exit(0);
}).catch(error => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
