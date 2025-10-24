import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database URL from environment variable
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Please configure it in schoolconnect/.env");
}

console.log("Initializing database connection...");
console.log("Using database URL:", DATABASE_URL);

// Configure connection pool with better settings
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  maxUses: 7500,
  // Allow self-signed certificates (consider proper CA in production)
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  application_name: 'SchoolHubConnect'
});

// Handle pool errors
pool.on('error', (err: any) => {
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
  client.on('error', (err: any) => {
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
  } catch (error: any) {
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