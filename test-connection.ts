import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = "postgres://postgres.lvsqjsytajbxvrkvjqnk:1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

async function testConnection() {
    try {
        console.log('Attempting to connect to database using Supabase connection pooling...');
        
        // Create a connection
        const sql = neon(DATABASE_URL);
        
        // Test the connection with a simple query
        const result = await sql`SELECT NOW()`;
        console.log('✅ Database connection successful!');
        console.log('Current database time:', result[0].now);
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(error.message);
        console.error('Full error:', error);
    } finally {
        process.exit();
    }
}

testConnection(); 