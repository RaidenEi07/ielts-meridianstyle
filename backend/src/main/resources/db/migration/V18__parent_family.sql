-- =====================================================================
-- V18 — Vai trò Phụ huynh + hồ sơ trẻ em (Phase 11).
--   Hồ sơ con là tài khoản đăng nhập độc lập thật (role 'student'), nhưng
--   phụ huynh không cần biết mật khẩu — chuyển sang học cùng con qua
--   /api/family/children/{childId}/switch, xác thực bằng bảng liên kết
--   phẳng này (giống teacher_student_assignments), không qua RBAC context.
-- =====================================================================
INSERT INTO roles (shortname, name, description) VALUES
    ('parent', 'Phụ huynh', 'Quản lý hồ sơ con, xem tiến độ học');

CREATE TABLE parent_child_profiles (
    id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    child_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (parent_id, child_id)
);
CREATE INDEX ix_pcp_parent ON parent_child_profiles (parent_id);
CREATE INDEX ix_pcp_child ON parent_child_profiles (child_id);
