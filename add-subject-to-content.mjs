import pg from 'pg';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // 1. Add subject_id column (nullable initially)
    console.log('Adding subject_id column to contents table...');
    await pool.query(`
      ALTER TABLE contents 
      ADD COLUMN IF NOT EXISTS subject_id INTEGER 
      REFERENCES subjects(id)
    `);

    // 2. Add status column with default value
    console.log('Adding status column to contents table...');
    await pool.query(`
      ALTER TABLE contents 
      ADD COLUMN IF NOT EXISTS status TEXT 
      DEFAULT 'active'
    `);

    // 3. Update existing content records to set subject_id to a default value
    // For existing records, we'll set them to the first subject for each class
    console.log('Updating existing content records with default subject IDs...');
    const contentRecords = await pool.query(`
      SELECT c.id, c.class_id 
      FROM contents c 
      WHERE c.subject_id IS NULL
    `);

    for (const record of contentRecords.rows) {
      // Find a subject associated with this class
      const subjectResult = await pool.query(`
        SELECT cs.subject_id 
        FROM class_subjects cs 
        WHERE cs.class_id = $1 
        LIMIT 1
      `, [record.class_id]);
      
      if (subjectResult.rows.length > 0) {
        const subjectId = subjectResult.rows[0].subject_id;
        await pool.query(`
          UPDATE contents 
          SET subject_id = $1 
          WHERE id = $2
        `, [subjectId, record.id]);
      } else {
        // If no class-subject association exists, use the first subject in the database
        const firstSubjectResult = await pool.query(`
          SELECT id FROM subjects LIMIT 1
        `);
        
        if (firstSubjectResult.rows.length > 0) {
          const defaultSubjectId = firstSubjectResult.rows[0].id;
          await pool.query(`
            UPDATE contents 
            SET subject_id = $1 
            WHERE id = $2
          `, [defaultSubjectId, record.id]);
        }
      }
    }

    // 4. Make subject_id column NOT NULL only if all records have been updated
    const nullSubjectRecords = await pool.query(`
      SELECT COUNT(*) FROM contents WHERE subject_id IS NULL
    `);
    
    if (parseInt(nullSubjectRecords.rows[0].count) === 0) {
      console.log('Making subject_id column NOT NULL...');
      await pool.query(`
        ALTER TABLE contents 
        ALTER COLUMN subject_id SET NOT NULL
      `);
    } else {
      console.log(`Warning: ${nullSubjectRecords.rows[0].count} records still have NULL subject_id`);
    }

    // 5. Make class_id column NOT NULL if it's not already
    console.log('Making class_id column NOT NULL...');
    await pool.query(`
      ALTER TABLE contents 
      ALTER COLUMN class_id SET NOT NULL
    `);

    // Commit the transaction
    await pool.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    // Rollback in case of error
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
});