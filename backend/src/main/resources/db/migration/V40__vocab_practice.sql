-- =====================================================================
-- V40 — Luyện từ vựng & phát âm (di trú nội dung H5P "Vocabulary: Review"
--   từ 2 khóa Moodle). 1 section có thể gắn nhiều bộ thẻ (vocab_sets), mỗi
--   bộ gồm nhiều thẻ (vocab_cards: từ hoặc câu ví dụ, kèm audio mẫu). Học
--   sinh ghi âm đọc lại (vocab_recordings), giáo viên chấm sao — cùng mẫu
--   với lesson_recordings (V22/V34) chứ không tự chấm bằng nhận diện giọng
--   nói như bản H5P gốc (không đáng tin cậy với giọng người Việt).
-- =====================================================================
CREATE TABLE vocab_sets (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id BIGINT       NOT NULL REFERENCES course_sections (id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_vocab_sets_section ON vocab_sets (section_id);

CREATE TABLE vocab_cards (
    id               BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    set_id           BIGINT       NOT NULL REFERENCES vocab_sets (id) ON DELETE CASCADE,
    card_type        VARCHAR(20)  NOT NULL DEFAULT 'WORD' CHECK (card_type IN ('WORD', 'SENTENCE')),
    text             TEXT         NOT NULL,
    accepted_answer  VARCHAR(500),
    audio_url        VARCHAR(500) NOT NULL,
    sort_order       INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX ix_vocab_cards_set ON vocab_cards (set_id);

CREATE TABLE vocab_recordings (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    card_id     BIGINT       NOT NULL REFERENCES vocab_cards (id) ON DELETE CASCADE,
    audio_url   VARCHAR(500) NOT NULL,
    star_rating INTEGER      CHECK (star_rating IS NULL OR star_rating BETWEEN 1 AND 5),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_vocab_recordings_user_card ON vocab_recordings (user_id, card_id);
CREATE INDEX ix_vocab_recordings_card ON vocab_recordings (card_id);
