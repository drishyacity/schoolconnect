import { pool, db } from './db';
import { contents, users, classes, subjects } from '../shared/schema';
import { count, eq } from 'drizzle-orm';

async function checkDatabase() {
  try {
    console.log("Checking database connection and content...");
    
    // Check if we can connect to the database
    const client = await pool.connect();
    try {
      console.log("Database connection successful");
      
      // Check if we have users
      const [userCount] = await db.select({ count: count() }).from(users);
      console.log(`Found ${userCount.count} users in database`);
      
      // Check if we have classes
      const [classCount] = await db.select({ count: count() }).from(classes);
      console.log(`Found ${classCount.count} classes in database`);
      
      // Check if we have subjects
      const [subjectCount] = await db.select({ count: count() }).from(subjects);
      console.log(`Found ${subjectCount.count} subjects in database`);
      
      // Check if we have content
      const [contentCount] = await db.select({ count: count() }).from(contents);
      console.log(`Found ${contentCount.count} content items in database`);
      
      // If we have content, let's check a sample
      if (Number(contentCount.count) > 0) {
        const contentSample = await db.select().from(contents).limit(1);
        console.log("Sample content item:", contentSample[0]);
      }
      
      // Check teachers
      const teachers = await db.select().from(users).where(eq(users.role, 'teacher'));
      console.log(`Found ${teachers.length} teachers in database`);
      if (teachers.length > 0) {
        console.log("Sample teacher:", {
          id: teachers[0].id,
          name: teachers[0].name,
          email: teachers[0].email
        });
      }
      
      console.log("Database check completed successfully");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database check failed:", error);
  }
}

// Run the check
checkDatabase().then(() => {
  console.log("Check completed");
  process.exit(0);
}).catch(error => {
  console.error("Check failed:", error);
  process.exit(1);
});
