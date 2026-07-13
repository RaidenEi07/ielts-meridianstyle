ALTER TABLE question_categories ADD COLUMN audience VARCHAR(20) NOT NULL DEFAULT 'IELTS';
ALTER TABLE course_categories ADD COLUMN audience_group VARCHAR(20) NOT NULL DEFAULT 'IELTS';
ALTER TABLE course_sections ADD COLUMN video_url VARCHAR(500);
