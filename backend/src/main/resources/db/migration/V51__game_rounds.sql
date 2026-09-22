-- =====================================================================
-- V51 — Chống "can thiệp tham số" (parameter tampering) ở tính năng điểm
--   thưởng game: trước đây POST /api/game/points nhận thẳng số "points" do
--   CHÍNH TRÌNH DUYỆT học sinh tự tính rồi báo lên, server chỉ kiểm > 0 và
--   gameMode có trong danh sách hợp lệ — không xác minh gì thêm, học sinh
--   có thể tự ý gửi bất kỳ số điểm nào mà không cần chơi thật (tìm ra khi
--   luyện tập lăng kính "Ranh giới tin cậy" áp cho khu vực game).
--
--   game_rounds: 1 lượt chơi do CHÍNH SERVER tạo ra khi bắt đầu (biết chắc
--   tổng số câu/cặp thật), server tự cộng dồn correct_count (đề Đua trả lời
--   nhanh, mỗi câu chấm qua endpoint check sẵn có) — điểm thưởng lúc kết
--   thúc được TÍNH TỪ ĐÂY, không nhận số "points" từ client nữa.
--   finished: chặn gọi kết thúc 2 lần trên cùng 1 lượt để cày điểm.
-- =====================================================================

CREATE TABLE game_rounds (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_mode             VARCHAR(20) NOT NULL,
    total_items           INT NOT NULL,
    correct_count         INT NOT NULL DEFAULT 0,
    answered_question_ids JSONB,
    finished              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_rounds_user ON game_rounds (user_id);
