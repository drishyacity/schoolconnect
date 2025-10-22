// Simple script to add content directly to the database
import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: 'postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false
  }
});

async function addContent() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');

    // Get a teacher ID
    const teacherResult = await client.query("SELECT id FROM users WHERE role = 'teacher' LIMIT 1");
    if (teacherResult.rows.length === 0) {
      console.log('No teachers found in database');
      return;
    }
    const teacherId = teacherResult.rows[0].id;
    console.log(`Using teacher ID: ${teacherId}`);

    // Get a class ID
    const classResult = await client.query("SELECT id FROM classes LIMIT 1");
    if (classResult.rows.length === 0) {
      console.log('No classes found in database');
      return;
    }
    const classId = classResult.rows[0].id;
    console.log(`Using class ID: ${classId}`);

    // Get a subject ID
    const subjectResult = await client.query("SELECT id FROM subjects LIMIT 1");
    if (subjectResult.rows.length === 0) {
      console.log('No subjects found in database');
      return;
    }
    const subjectId = subjectResult.rows[0].id;
    console.log(`Using subject ID: ${subjectId}`);

    // Add content
    const contentTypes = ['note', 'homework', 'dpp', 'lecture', 'sample_paper'];

    for (const type of contentTypes) {
      console.log(`Adding ${type} content`);

      const title = `${type.charAt(0).toUpperCase() + type.slice(1)} - Sample`;
      const description = `This is a sample ${type} for testing purposes`;

      const query = `
        INSERT INTO contents (title, description, content_type, class_id, subject_id, author_id, file_url, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `;

      await client.query(query, [
        title,
        description,
        type,
        classId,
        subjectId,
        teacherId,
        'https://example.com/file.pdf',
        'active'
      ]);

      console.log(`Added ${type} content successfully`);
    }

    console.log('All content added successfully');
  } catch (error) {
    console.error('Error adding content:', error);
  } finally {
    client.release();
  }
}

addContent()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
