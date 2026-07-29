ALTER TABLE lesson_recordings ADD COLUMN star_rating integer;
ALTER TABLE lesson_recordings ADD CONSTRAINT chk_lesson_recordings_star_rating
    CHECK (star_rating IS NULL OR star_rating BETWEEN 1 AND 5);
