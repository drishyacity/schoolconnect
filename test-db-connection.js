import { Pool } from 'pg';
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
        
        // Create a pg pool connection
        const pool = new Pool({
            connectionString: databaseUrl,
            // Allow self-signed certificates (use a proper CA bundle in production)
            ssl: { rejectUnauthorized: false }
        });
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Database connection successful!');
        console.log('Current database time:', result.rows[0].now);
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(error.message);
    } finally {
        process.exit();
    }
}

testConnection(); 