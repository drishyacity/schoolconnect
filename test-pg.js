import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres.lvsqjsytajbxvrkvjqnk',
    password: 'viraj1316mp',
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    }
});

async function testConnection() {
    try {
        console.log('Attempting to connect to database...');
        console.log('Using connection pooling:');
        console.log('- Host:', 'aws-0-ap-south-1.pooler.supabase.com');
        console.log('- Port:', 6543);
        console.log('- Database:', 'postgres');
        console.log('- User:', 'postgres.lvsqjsytajbxvrkvjqnk');
        
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
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.detail) console.error('Error detail:', error.detail);
        console.error('Please verify:');
        console.error('1. The database credentials are correct');
        console.error('2. The database is accessible from your current network');
        console.error('3. The database server is running and accepting connections');
    } finally {
        await pool.end();
        process.exit();
    }
}

testConnection(); 