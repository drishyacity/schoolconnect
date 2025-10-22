import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Set NODE_ENV and ensure DATABASE_URL is set
process.env.NODE_ENV = 'development';
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
}

console.log('Starting development server with DATABASE_URL:', process.env.DATABASE_URL);

// Start the development server using tsx
const tsx = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    shell: true,
    env: process.env
});

tsx.on('error', (err) => {
    console.error('Failed to start development server:', err);
    process.exit(1);
});

tsx.on('exit', (code) => {
    if (code !== 0) {
        console.error(`Development server exited with code ${code}`);
        process.exit(code);
    }
}); 