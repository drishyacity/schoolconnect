import { db } from './server/db';
import { users } from './shared/schema';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
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

async function verifyPassword() {
  try {
    const username = 'viraj1316';
    const password = 'viraj1316mp';
    
    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user) {
      console.log('User not found:', username);
      return;
    }
    
    console.log('Found user:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
    
    console.log('Stored password format:', user.password);
    
    // Try to verify the password
    try {
      const [hashed, salt] = user.password.split('.');
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = await scryptAsync(password, salt, 64) as Buffer;
      const isValid = timingSafeEqual(hashedBuf, suppliedBuf);
      
      console.log('Password verification result:', isValid);
    } catch (error) {
      console.error('Error verifying password:', error);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

verifyPassword(); 