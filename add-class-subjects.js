import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = 'postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function addClassSubjects() {
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    try {
        // First, let's create another class if it doesn't exist
        const newClassResult = await pool.query(`
            INSERT INTO classes (name, grade, section)
            VALUES ('02', 1, 'B')
            ON CONFLICT (id) DO NOTHING
            RETURNING id;
        `);
        
        console.log('Created new class:', newClassResult.rows[0]);
        
        // Get all subjects
        const subjects = await pool.query('SELECT * FROM subjects');
        
        // Get all classes
        const classes = await pool.query('SELECT * FROM classes');
        
        // Get teacher ID (using ID 8 as it exists in the database)
        const teacherId = 8;
        
        // Create class-subject associations
        for (const subject of subjects.rows) {
            for (const classItem of classes.rows) {
                // Check if association already exists
                const existingAssoc = await pool.query(
                    'SELECT * FROM class_subjects WHERE class_id = $1 AND subject_id = $2',
                    [classItem.id, subject.id]
                );
                
                if (existingAssoc.rows.length === 0) {
                    // Create new association
                    await pool.query(
                        'INSERT INTO class_subjects (class_id, subject_id, teacher_id) VALUES ($1, $2, $3)',
                        [classItem.id, subject.id, teacherId]
                    );
                    console.log(`Created association: Class ${classItem.name} - Subject ${subject.name}`);
                }
            }
        }
        
        console.log('Successfully added class-subject associations!');
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.detail) console.error('Error detail:', error.detail);
    } finally {
        await pool.end();
    }
}

addClassSubjects(); 