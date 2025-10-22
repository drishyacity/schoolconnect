import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
    try {
        // Get the DATABASE_URL from environment variables
        const databaseUrl = process.env.DATABASE_URL;
        
        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not set in .env file');
        }

        console.log('Attempting to connect to database...');
        
        // Create a connection
        const sql = neon(databaseUrl);
        const db = drizzle(sql);

        // Test the connection with a simple query
        const result = await sql`SELECT NOW()`;
        console.log('✅ Database connection successful!');
        console.log('Current database time:', result[0].now);
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(error.message);
    } finally {
        process.exit();
    }
}

testConnection(); 