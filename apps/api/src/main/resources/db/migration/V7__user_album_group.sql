-- Add missing columns for User entity alignment
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS album_number VARCHAR(50);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS class_group_id BIGINT REFERENCES courses(id) ON DELETE SET NULL;

