-- =====================================================================
-- V27 — Lồng tiếng nhân vật (Phase 16, lát 3). Đổi bản ghi âm từ gắn theo
--   nhân vật sang gắn theo từng đoạn thoại (character_id -> segment_id):
--   1 nhân vật có thể nói nhiều lần ở nhiều thời điểm khác nhau trong
--   video (nhiều dòng dubbing_character_segments), nên cần ghi âm riêng
--   cho từng đoạn thay vì 1 bản ghi chung cho cả nhân vật.
-- =====================================================================
ALTER TABLE dubbing_recordings DROP CONSTRAINT dubbing_recordings_character_id_fkey;
DROP INDEX ix_dubbing_recordings_user_character;
ALTER TABLE dubbing_recordings RENAME COLUMN character_id TO segment_id;
ALTER TABLE dubbing_recordings
    ADD CONSTRAINT dubbing_recordings_segment_id_fkey
    FOREIGN KEY (segment_id) REFERENCES dubbing_character_segments (id) ON DELETE CASCADE;
CREATE INDEX ix_dubbing_recordings_user_segment ON dubbing_recordings (user_id, segment_id);
