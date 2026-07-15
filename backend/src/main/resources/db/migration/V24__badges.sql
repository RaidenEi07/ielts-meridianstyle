-- =====================================================================
-- V24 — Huy hiệu (Phase 19, lát 3). Danh mục cố định seed sẵn, đạt qua
--   điều kiện tính từ points_ledger (không cần bảng đếm riêng).
-- =====================================================================
CREATE TABLE badges (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    emoji       VARCHAR(10)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_badges (
    id        BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    badge_id  BIGINT      NOT NULL REFERENCES badges (id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, badge_id)
);
CREATE INDEX ix_user_badges_user ON user_badges (user_id);

INSERT INTO badges (code, name, description, emoji) VALUES
    ('FIRST_PLAY',      'Người mới',        'Chơi lượt game đầu tiên',                  '🌟'),
    ('FIVE_ROUNDS',     'Chăm chỉ',         'Hoàn thành 5 lượt chơi',                   '🔥'),
    ('HUNDRED_POINTS',  'Vô địch nhỏ',      'Đạt 100 điểm tích lũy',                    '🏆'),
    ('MEMORY_MASTER',   'Bậc thầy lật thẻ', 'Hoàn thành 5 lượt Lật thẻ ghi nhớ',         '🎮'),
    ('RACE_MASTER',     'Tia chớp',         'Hoàn thành 5 lượt Đua trả lời nhanh',       '⚡'),
    ('BOTH_MODES',      'Đa tài',           'Đã chơi cả 2 chế độ game',                  '🌈');
