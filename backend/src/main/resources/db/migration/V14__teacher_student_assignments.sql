-- =====================================================================
-- V14 — Roster giáo viên–học sinh (gán thủ công, không theo ngữ cảnh RBAC).
--   RBAC hiện tại chỉ gán quyền theo context (khóa học/danh mục), không thể
--   diễn đạt "giáo viên X quản lý đúng N học sinh cụ thể" — bảng này là một
--   quan hệ độc lập, phẳng, dùng riêng cho tính năng theo dõi kết quả.
-- =====================================================================
CREATE TABLE teacher_student_assignments (
    id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    teacher_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    student_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (teacher_id, student_id)
);
CREATE INDEX ix_tsa_teacher ON teacher_student_assignments (teacher_id);
CREATE INDEX ix_tsa_student ON teacher_student_assignments (student_id);
