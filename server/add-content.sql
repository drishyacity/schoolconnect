-- Add sample content to the database

-- Insert a note
INSERT INTO contents (title, description, content_type, class_id, subject_id, author_id, file_url, status, created_at)
VALUES ('Physics Notes', 'Comprehensive notes on mechanics and thermodynamics', 'note', 1, 1, 1, 'https://example.com/notes.pdf', 'active', NOW());

-- Insert a homework
INSERT INTO contents (title, description, content_type, class_id, subject_id, author_id, file_url, status, created_at, due_date)
VALUES ('Math Homework', 'Practice problems on calculus', 'homework', 1, 1, 1, 'https://example.com/homework.pdf', 'active', NOW(), NOW() + INTERVAL '7 days');

-- Insert a DPP
INSERT INTO contents (title, description, content_type, class_id, subject_id, author_id, file_url, status, created_at, due_date)
VALUES ('Chemistry DPP', 'Daily practice problems on organic chemistry', 'dpp', 1, 1, 1, 'https://example.com/dpp.pdf', 'active', NOW(), NOW() + INTERVAL '3 days');

-- Insert a lecture
INSERT INTO contents (title, description, content_type, class_id, subject_id, author_id, file_url, status, created_at)
VALUES ('Biology Lecture', 'Video lecture on cell biology', 'lecture', 1, 1, 1, 'https://example.com/lecture.mp4', 'active', NOW());

-- Insert a sample paper
INSERT INTO contents (title, description, content_type, class_id, subject_id, author_id, file_url, status, created_at)
VALUES ('English Sample Paper', 'Sample paper for final exam', 'sample_paper', 1, 1, 1, 'https://example.com/sample_paper.pdf', 'active', NOW());
