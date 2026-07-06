-- =====================================================================
-- V3 — Khóa học & Category (Giai đoạn 2)
-- Phân cấp: Category -> Course -> Section. Category có thể gắn Exam Template.
-- Mỗi Category/Course có một context tương ứng (cho RBAC theo ngữ cảnh).
-- Soft-delete qua cột deleted_at (thùng rác).
-- =====================================================================

-- ---------------------------------------------------------------------
-- exam_templates — hồ sơ thi (IELTS/TOEFL...) điều khiển giao diện làm bài.
--   Cấu hình linh hoạt lưu JSONB để mở rộng mà không sửa schema.
-- ---------------------------------------------------------------------
CREATE TABLE exam_templates (
    id                    BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                  VARCHAR(50)  NOT NULL UNIQUE,   -- 'IELTS', 'TOEFL'...
    name                  VARCHAR(120) NOT NULL,
    skill_layout_config   JSONB,
    timer_rules           JSONB,
    band_score_conversion JSONB,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- course_categories — danh mục khóa học (+ exam_template_id, + context_id)
-- ---------------------------------------------------------------------
CREATE TABLE course_categories (
    id               BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    slug             VARCHAR(160) NOT NULL UNIQUE,
    description      TEXT,
    exam_template_id BIGINT       REFERENCES exam_templates (id) ON DELETE SET NULL,
    context_id       BIGINT       REFERENCES contexts (id),
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
CREATE TABLE courses (
    id              BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id     BIGINT        NOT NULL REFERENCES course_categories (id),
    title           VARCHAR(200)  NOT NULL,
    shortname       VARCHAR(80)   NOT NULL UNIQUE,
    summary         TEXT,
    status          VARCHAR(20)   NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    cover_image_url VARCHAR(500),
    price           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    context_id      BIGINT        REFERENCES contexts (id),
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_courses_category ON courses (category_id);
CREATE INDEX ix_courses_status ON courses (status);

-- ---------------------------------------------------------------------
-- course_sections
-- ---------------------------------------------------------------------
CREATE TABLE course_sections (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id  BIGINT       NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_sections_course ON course_sections (course_id);

-- ---------------------------------------------------------------------
-- enrollments — ghi danh học viên vào khóa học
-- ---------------------------------------------------------------------
CREATE TABLE enrollments (
    id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    course_id    BIGINT      NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    progress_pct INT         NOT NULL DEFAULT 0
                 CHECK (progress_pct BETWEEN 0 AND 100),
    enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);
CREATE INDEX ix_enrollments_user ON enrollments (user_id);
CREATE INDEX ix_enrollments_course ON enrollments (course_id);
