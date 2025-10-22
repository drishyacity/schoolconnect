// Script to reset quiz attempts for a student
const { db } = require('./db');
const { quizAttempts } = require('./schema');
const { eq } = require('drizzle-orm');

async function resetQuizAttempts(studentId) {
  try {
    console.log(`Resetting quiz attempts for student ${studentId}...`);
    
    // Delete all quiz attempts for the student
    const result = await db.delete(quizAttempts)
      .where(eq(quizAttempts.studentId, studentId))
      .returning();
    
    console.log(`Successfully deleted ${result.length} quiz attempts for student ${studentId}`);
    console.log('Deleted attempts:', result);
    
    return result;
  } catch (error) {
    console.error('Error resetting quiz attempts:', error);
    throw error;
  }
}

// Run the function with student ID 9 (stu01)
resetQuizAttempts(9)
  .then(() => {
    console.log('Reset completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Reset failed:', error);
    process.exit(1);
  });
