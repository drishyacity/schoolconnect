const { Pool } = require('pg');
require('dotenv').config();

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
      }
    }

    // 4. Make subject_id column NOT NULL
    console.log('Making subject_id column NOT NULL...');
    await pool.query(`
      ALTER TABLE contents 
      ALTER COLUMN subject_id SET NOT NULL
    `);

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