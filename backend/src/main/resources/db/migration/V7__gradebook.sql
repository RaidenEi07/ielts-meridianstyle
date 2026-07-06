-- =====================================================================
-- V7 — Gradebook & Báo cáo (Giai đoạn 5)
-- Sổ điểm và báo cáo là các truy vấn tổng hợp trên bảng đã có
-- (quiz_attempts, enrollments...). Bảng mới: grade_history (audit chấm tay).
-- =====================================================================

CREATE TABLE grade_history (
    id         BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attempt_id BIGINT        NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
    answer_id  BIGINT        REFERENCES quiz_attempt_answers (id) ON DELETE SET NULL,
    changed_by UUID          REFERENCES users (id) ON DELETE SET NULL,
    old_mark   NUMERIC(6, 2),
    new_mark   NUMERIC(6, 2),
    reason     VARCHAR(255),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_grade_history_attempt ON grade_history (attempt_id);
