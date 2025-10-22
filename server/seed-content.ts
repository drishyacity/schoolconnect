import { Storage } from './storage';
import { InsertContent } from '@shared/schema';

// Create a new storage instance
const storage = new Storage();

async function seedContent() {
  try {
    console.log('Starting content seeding...');
    
    // Get all users with role 'teacher'
    const users = await storage.getUsers();
    const teachers = users.filter(user => user.role === 'teacher');
    
    if (teachers.length === 0) {
      console.log('No teachers found. Please create a teacher account first.');
      return;
    }
    
    // Get all classes
    const classes = await storage.getClasses();
    if (classes.length === 0) {
      console.log('No classes found. Please create classes first.');
      return;
    }
    
    // Get all subjects
    const subjects = await storage.getSubjects();
    if (subjects.length === 0) {
      console.log('No subjects found. Please create subjects first.');
      return;
    }
    
    // Create sample content for each teacher
    for (const teacher of teachers) {
      console.log(`Creating content for teacher: ${teacher.name} (ID: ${teacher.id})`);
      
      // Create a note
      const note: InsertContent = {
        title: `Physics Notes - ${teacher.name}`,
        description: 'Comprehensive notes on mechanics and thermodynamics',
        contentType: 'note',
        authorId: teacher.id,
        classId: classes[0].id,
        subjectId: subjects[0].id,
        fileUrl: 'https://example.com/notes.pdf',
        status: 'active',
      };
      
      // Create a homework
      const homework: InsertContent = {
        title: `Math Homework - ${teacher.name}`,
        description: 'Practice problems on calculus',
        contentType: 'homework',
        authorId: teacher.id,
        classId: classes[0].id,
        subjectId: subjects[1].id,
        fileUrl: 'https://example.com/homework.pdf',
        status: 'active',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
      };
      
      // Create a DPP
      const dpp: InsertContent = {
        title: `Chemistry DPP - ${teacher.name}`,
        description: 'Daily practice problems on organic chemistry',
        contentType: 'dpp',
        authorId: teacher.id,
        classId: classes[0].id,
        subjectId: subjects[2].id,
        fileUrl: 'https://example.com/dpp.pdf',
        status: 'active',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
      };
      
      // Create a lecture
      const lecture: InsertContent = {
        title: `Biology Lecture - ${teacher.name}`,
        description: 'Video lecture on cell biology',
        contentType: 'lecture',
        authorId: teacher.id,
        classId: classes[0].id,
        subjectId: subjects[3].id,
        fileUrl: 'https://example.com/lecture.mp4',
        status: 'active',
      };
      
      // Create a sample paper
      const samplePaper: InsertContent = {
        title: `English Sample Paper - ${teacher.name}`,
        description: 'Sample paper for final exam',
        contentType: 'sample_paper',
        authorId: teacher.id,
        classId: classes[0].id,
        subjectId: subjects[4].id,
        fileUrl: 'https://example.com/sample_paper.pdf',
        status: 'active',
      };
      
      // Insert all content
      try {
        await storage.createContent(note);
        console.log('Note created successfully');
      } catch (error) {
        console.error('Error creating note:', error);
      }
      
      try {
        await storage.createContent(homework);
        console.log('Homework created successfully');
      } catch (error) {
        console.error('Error creating homework:', error);
      }
      
      try {
        await storage.createContent(dpp);
        console.log('DPP created successfully');
      } catch (error) {
        console.error('Error creating DPP:', error);
      }
      
      try {
        await storage.createContent(lecture);
        console.log('Lecture created successfully');
      } catch (error) {
        console.error('Error creating lecture:', error);
      }
      
      try {
        await storage.createContent(samplePaper);
        console.log('Sample paper created successfully');
      } catch (error) {
        console.error('Error creating sample paper:', error);
      }
    }
    
    console.log('Content seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding content:', error);
  }
}

// Run the seeding function
seedContent().then(() => {
  console.log('Seeding script completed');
  process.exit(0);
}).catch(error => {
  console.error('Seeding script failed:', error);
  process.exit(1);
});
