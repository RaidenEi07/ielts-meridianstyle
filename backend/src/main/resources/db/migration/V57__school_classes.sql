-- =====================================================================
-- V57 — Lớp học (nhóm học viên): gán nhiều tài khoản vào 1 lớp, gắn lớp vào
--   khóa học thì cả lớp được ghi danh khóa đó. Đây là dữ liệu CỤC BỘ của từng
--   web (web tổng / web con tự có lớp riêng) — không đi theo việc phân phối
--   khóa học từ web tổng sang web con.
--
--   Quan hệ giữa lớp và khóa học được GIỮ LẠI (school_class_courses) để
--   thành viên thêm vào lớp SAU này cũng tự được ghi danh. Ngược lại, gỡ
--   thành viên khỏi lớp hoặc gỡ khóa khỏi lớp KHÔNG tự hủy ghi danh đã có
--   (tránh mất bài làm của học viên) — việc hủy ghi danh vẫn làm riêng.
-- =====================================================================
CREATE TABLE school_classes (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    created_by  UUID         REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_school_classes_name ON school_classes (lower(name));

CREATE TABLE school_class_members (
    id       BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id BIGINT      NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
    user_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, user_id)
);
CREATE INDEX ix_scm_user ON school_class_members (user_id);

CREATE TABLE school_class_courses (
    id        BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id  BIGINT      NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
    course_id BIGINT      NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, course_id)
);
CREATE INDEX ix_scc_course ON school_class_courses (course_id);
