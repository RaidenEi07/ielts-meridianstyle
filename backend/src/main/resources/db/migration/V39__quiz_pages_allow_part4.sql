-- Listening quizzes have 4 parts (Part 1-4), not 3 like Reading's 3 passages.
-- The original CHECK constraint (V6) assumed Reading's shape and blocked a
-- valid Part 4 page from ever being created, which is the root cause of
-- every migrated "listening N" quiz missing its Part 4 (and often Part 2)
-- content — those questions had nowhere valid to attach and stayed
-- page_id = NULL ("Câu hỏi khác" bucket at the end of the exam).
alter table quiz_pages drop constraint quiz_pages_page_number_check;
alter table quiz_pages add constraint quiz_pages_page_number_check
    check (page_number between 1 and 4);
