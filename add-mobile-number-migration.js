import { db, pool } from './server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Starting migration to add mobileNumber column to users table...');
  
  try {
    // Add mobile_number column to users table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mobile_number TEXT
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

main();