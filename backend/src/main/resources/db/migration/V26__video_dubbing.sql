-- =====================================================================
-- V26 — Lồng tiếng nhân vật (Phase 16, lát 1). Admin định nghĩa nhân vật +
--   đoạn thời gian nói trong video; học sinh sẽ bật/tắt từng nhân vật và
--   ghi âm thay thế (lát 2) rồi xuất video bằng ffmpeg.wasm (lát 3).
-- =====================================================================
CREATE TABLE dubbing_characters (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id BIGINT       NOT NULL REFERENCES course_sections (id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_dubbing_characters_section ON dubbing_characters (section_id);

CREATE TABLE dubbing_character_segments (
    id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    character_id  BIGINT       NOT NULL REFERENCES dubbing_characters (id) ON DELETE CASCADE,
    start_seconds NUMERIC(8,2) NOT NULL,
    end_seconds   NUMERIC(8,2) NOT NULL,
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    CHECK (end_seconds > start_seconds)
);
CREATE INDEX ix_dubbing_segments_character ON dubbing_character_segments (character_id);

-- Ghi âm của học sinh — chưa dùng tới ở lát 1, tạo sẵn cùng nhóm bảng để
-- tránh 1 migration rời chỉ thêm 1 bảng nhỏ ở lát 2.
CREATE TABLE dubbing_recordings (
    id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    character_id BIGINT       NOT NULL REFERENCES dubbing_characters (id) ON DELETE CASCADE,
    audio_url    VARCHAR(500) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_dubbing_recordings_user_character ON dubbing_recordings (user_id, character_id);
