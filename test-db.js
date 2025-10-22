import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = 'postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function testConnection() {
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    try {
        console.log('Testing database connection...');
        
        // Test basic connection
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful!');
        console.log('Current database time:', result.rows[0].now);
        
        // Check subjects table
        console.log('\nChecking subjects table...');
        const subjectsResult = await pool.query('SELECT * FROM subjects');
        console.log(`Found ${subjectsResult.rows.length} subjects:`);
        subjectsResult.rows.forEach(subject => {
            console.log(`- ${subject.name} (ID: ${subject.id})`);
        });
        
        // Check classes table
        console.log('\nChecking classes table...');
        const classesResult = await pool.query('SELECT * FROM classes');
        console.log(`Found ${classesResult.rows.length} classes:`);
        classesResult.rows.forEach(classItem => {
            console.log(`- ${classItem.name} (ID: ${classItem.id}, Grade: ${classItem.grade}, Section: ${classItem.section || 'N/A'})`);
        });
        
        // Check class_subjects table
        console.log('\nChecking class_subjects table...');
        const classSubjectsResult = await pool.query('SELECT * FROM class_subjects');
        console.log(`Found ${classSubjectsResult.rows.length} class-subject associations:`);
        classSubjectsResult.rows.forEach(cs => {
            console.log(`- Class ID: ${cs.class_id}, Subject ID: ${cs.subject_id}, Teacher ID: ${cs.teacher_id}`);
        });
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.detail) console.error('Error detail:', error.detail);
    } finally {
        await pool.end();
    }
}

testConnection();