-- =====================================================================
-- V23 — Điểm thưởng cho game hóa (Phase 19, lát 1: Lật thẻ ghi nhớ).
--   Mỗi lượt chơi hoàn thành ghi 1 dòng — lịch sử tích điểm, theo khuôn
--   mẫu grade_history. Dùng để tính bảng xếp hạng (SUM theo user_id).
-- =====================================================================
CREATE TABLE points_ledger (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    points     INTEGER      NOT NULL,
    reason     VARCHAR(255) NOT NULL,
    game_mode  VARCHAR(50)  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_points_ledger_user ON points_ledger (user_id);
