import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.DATABASE_URL = 'postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

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