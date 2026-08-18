-- Native <audio> scrub/volume bar is hidden by default to match real exam
-- conditions (no seeking) on mock-test quizzes. Curriculum/practice courses
-- (e.g. UPPER, INTER, Boost) want it visible so students can pause/rewind
-- freely. Per-quiz opt-in, default false preserves current exam behavior.
ALTER TABLE quizzes ADD COLUMN audio_controls_enabled boolean NOT NULL DEFAULT false;
