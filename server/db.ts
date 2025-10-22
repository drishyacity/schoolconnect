import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Neon WebSocket
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = true;
neonConfig.fetchEndpoint = "https://console.neon.tech/api/v2/projects/lvsqjsytajbxvrkvjqnk/branches/main/endpoints";
neonConfig.fetchConnectionCache = true;

// Get database URL from environment variable
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';

console.log("Initializing database connection...");
console.log("Using database URL:", DATABASE_URL);

// Configure connection pool with better settings
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  maxUses: 7500,
  ssl: {
    rejectUnauthorized: true, // Enforce SSL certificate validation
    sslmode: 'require'
  },
  keepAlive: true,
  application_name: 'SchoolHubConnect'
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  console.error('Error details:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
});

// Handle connection errors
pool.on('connect', (client) => {
  console.log('New client connected to database');
  client.on('error', (err) => {
    console.error('Database client error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
  });
});

// Create a function to check the connection
export async function checkConnection() {
  let client;
  try {
    console.log("Testing database connection...");
    client = await pool.connect();

    // Test the connection with a simple query
    const result = await client.query('SELECT NOW()');
    console.log("Database connection test successful");
    console.log("Current database time:", result.rows[0].now);

    // Test subjects table
    const subjectsResult = await client.query('SELECT * FROM subjects');
    console.log(`Found ${subjectsResult.rows.length} subjects in database`);
    subjectsResult.rows.forEach(subject => {
      console.log(`- ${subject.name} (ID: ${subject.id})`);
    });

    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Export the database instance
export const db = drizzle(pool, { schema });

// Export a function to get the database instance
export async function getDb() {
  return db;
}

// Export a function to get the schema
export function getSchema() {
  return schema;
}