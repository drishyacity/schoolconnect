import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { db } from './server/db.js';
import { users } from './shared/schema.js';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
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
      role: 'admin',
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