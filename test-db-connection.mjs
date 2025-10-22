import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';

// Load environment variables
dotenv.config();

// Configure Neon WebSocket
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = true;
neonConfig.fetchConnectionCache = true;

async function testConnection() {
    try {
        // Get the DATABASE_URL from environment variables
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not set in .env file');
        }

        console.log('Attempting to connect to database...');
        console.log('Database URL found:', databaseUrl);

        // Create a connection with SSL options
        const sql = neon(databaseUrl, {
            ssl: {
                rejectUnauthorized: true,
                sslmode: 'require'
            }
        });

        const db = drizzle(sql);

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