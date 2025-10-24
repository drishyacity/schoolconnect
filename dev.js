import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env if present
dotenv.config();

// Set environment variables
process.env.NODE_ENV = 'development';
// Do not override DATABASE_URL; expect it from the environment/.env

// Start the server
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  shell: true
});

// Handle process events
server.on('error', (error) => {
  console.error('Failed to start server:', error);
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit();
}); 