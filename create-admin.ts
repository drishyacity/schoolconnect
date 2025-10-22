import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { db } from './server/db';
import { users } from './shared/schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set DATABASE_URL if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function createAdminUser() {
  try {
    const password = 'viraj1316mp';
    const hashedPassword = await hashPassword(password);
    
    const adminUser = {
      username: 'admin',
      email: 'admin@schoolhub.com',
      password: hashedPassword,
      name: 'Administrator',
      role: 'admin' as const,
      joinedAt: new Date()
    };

    const [user] = await db.insert(users).values(adminUser).returning();
    console.log('Admin user created successfully:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    process.exit();
  }
}

createAdminUser(); 