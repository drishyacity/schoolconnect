// Simple script to migrate the database
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    // Create user_role enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
        END IF;
      END
      $$;
    `);

    // Create content_type enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
          CREATE TYPE content_type AS ENUM ('note', 'homework', 'dpp', 'quiz', 'lecture', 'sample_paper');
        END IF;
      END
      $$;
    `);
    
    // Create category enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category') THEN
          CREATE TYPE category AS ENUM ('general', 'obc', 'sc', 'st', 'ews', 'other');
        END IF;
      END
      $$;
    `);
    
    // Create religion enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'religion') THEN
          CREATE TYPE religion AS ENUM ('hindu', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'other');
        END IF;
      END
      $$;
    `);
    
    // Create experience_level enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experience_level') THEN
          CREATE TYPE experience_level AS ENUM ('beginner', '6months+', '1year+', '2years+', '3years+', '5years+');
        END IF;
      END
      $$;
    `);
    
    // Create document_type enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
          CREATE TYPE document_type AS ENUM ('aadhar', 'transfer_certificate', 'previous_result', 'birth_certificate', 'other');
        END IF;
      END
      $$;
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role user_role NOT NULL,
        profile_image TEXT,
        bio TEXT,
        grade INTEGER,
        section TEXT,
        age INTEGER,
        admission_no TEXT,
        aadhar_no TEXT,
        documents JSONB,
        father_name TEXT,
        mother_name TEXT,
        guardian_name TEXT,
        parents_email TEXT,
        parents_mobile TEXT,
        guardian_mobile TEXT,
        address TEXT,
        bus_stop TEXT,
        category category,
        religion religion,
        experience_level experience_level,
        joined_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create subjects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      );
    `);

    // Create classes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        grade INTEGER NOT NULL,
        section TEXT
      );
    `);

    // Create class_subjects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_subjects (
        id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(id),
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        teacher_id INTEGER NOT NULL REFERENCES users(id)
      );
    `);

    // Create class_enrollments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(id),
        student_id INTEGER NOT NULL REFERENCES users(id)
      );
    `);

    // Create contents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT,
        content_type content_type NOT NULL,
        class_id INTEGER REFERENCES classes(id),
        author_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        due_date TIMESTAMP
      );
    `);

    // Create quizzes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        content_id INTEGER NOT NULL REFERENCES contents(id),
        time_limit INTEGER,
        passing_score INTEGER,
        total_points INTEGER NOT NULL
      );
    `);

    // Create questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
        question_text TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer TEXT NOT NULL,
        points INTEGER NOT NULL
      );
    `);

    // Create quiz_attempts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
        student_id INTEGER NOT NULL REFERENCES users(id),
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP,
        score INTEGER,
        answers JSONB
      );
    `);
    
    // Create student_documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_documents (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id),
        document_type document_type NOT NULL,
        document_url TEXT NOT NULL,
        document_name TEXT NOT NULL,
        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Add missing columns to users table if it exists already
    await pool.query(`
      DO $$
      BEGIN
        ALTER TABLE IF EXISTS users 
        ADD COLUMN IF NOT EXISTS profile_image TEXT,
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS grade INTEGER,
        ADD COLUMN IF NOT EXISTS section TEXT,
        ADD COLUMN IF NOT EXISTS age INTEGER,
        ADD COLUMN IF NOT EXISTS admission_no TEXT,
        ADD COLUMN IF NOT EXISTS aadhar_no TEXT,
        ADD COLUMN IF NOT EXISTS documents JSONB,
        ADD COLUMN IF NOT EXISTS father_name TEXT,
        ADD COLUMN IF NOT EXISTS mother_name TEXT,
        ADD COLUMN IF NOT EXISTS guardian_name TEXT,
        ADD COLUMN IF NOT EXISTS parents_email TEXT,
        ADD COLUMN IF NOT EXISTS parents_mobile TEXT,
        ADD COLUMN IF NOT EXISTS guardian_mobile TEXT,
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS bus_stop TEXT,
        ADD COLUMN IF NOT EXISTS category category,
        ADD COLUMN IF NOT EXISTS religion religion,
        ADD COLUMN IF NOT EXISTS experience_level experience_level,
        ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW() NOT NULL;
      EXCEPTION
        WHEN duplicate_column THEN
          -- Do nothing, column already exists
      END
      $$;
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();