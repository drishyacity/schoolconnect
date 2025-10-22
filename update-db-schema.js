import { db } from './server/db.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

console.log('Starting schema migration...');

// Apply migrations
migrate(db, { migrationsFolder: './drizzle' })
  .then(() => {
    console.log('Schema migration completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });