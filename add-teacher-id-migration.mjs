// Migration to add teacher_id column to users table
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Starting migration: Adding teacher_id column to users table');
    
    // Check if the column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'teacher_id'
    `);
    
    if (checkResult.rows.length === 0) {
      // Add the teacher_id column
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN teacher_id TEXT
      `);
      console.log('Successfully added teacher_id column to users table');
    } else {
      console.log('teacher_id column already exists in users table');
    }
    
    // Close the pool
    await pool.end();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});