import { db } from './server/db';
import { users } from './shared/schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set DATABASE_URL if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
}

async function createUser() {
  try {
    const userData = {
      username: 'viraj1316',
      email: 'viraj1316@schoolhub.com',
      password: '2327012ce1a3fddb9fc97dba7f6c0078a3b2d5d43769b039d11bf6590811f017b4e3ab5c9ffcec5010815f6c303d484ccebc66039b17d10b7902f4030b0f53c1.523c5e912db72068bfac78802bd96ec0',
      name: 'Viraj',
      role: 'admin' as const,
      joinedAt: new Date()
    };

    const [user] = await db.insert(users).values(userData).returning();
    console.log('User created successfully:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    process.exit();
  }
}

createUser(); 