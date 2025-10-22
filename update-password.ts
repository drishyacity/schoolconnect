import { db } from './server/db';
import { users } from './shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

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

async function updateUserPassword() {
  try {
    const username = 'viraj1316';
    const password = 'viraj1316mp'; // The actual password you want to use
    
    const hashedPassword = await hashPassword(password);
    
    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, username))
      .returning();
    
    if (updatedUser) {
      console.log('Password updated successfully for user:', username);
      console.log('New password hash:', hashedPassword);
    } else {
      console.log('User not found:', username);
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    process.exit();
  }
}

updateUserPassword(); 