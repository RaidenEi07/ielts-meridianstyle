-- =====================================================================
-- V1 — Users + RBAC theo ngữ cảnh (Role-Context model, kiểu Moodle)
-- Tham chiếu: Kế hoạch V3, mục 2 (RBAC theo Context) và mục 8.
-- =====================================================================

-- ---------------------------------------------------------------------
-- users — KHÔNG còn cột role cố định (role được gán qua role_assignments)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));

-- ---------------------------------------------------------------------
-- contexts — cây phân cấp SYSTEM -> CATEGORY -> COURSE -> QUIZ
--   instance_id trỏ tới đối tượng tương ứng (NULL cho SYSTEM).
--   parent_context_id cho phép kế thừa quyền theo cây.
-- ---------------------------------------------------------------------
CREATE TABLE contexts (
    id                BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type              VARCHAR(20)  NOT NULL
                      CHECK (type IN ('SYSTEM', 'CATEGORY', 'COURSE', 'QUIZ')),
    instance_id       BIGINT,
    parent_context_id BIGINT       REFERENCES contexts (id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Một (type, instance_id) là duy nhất. SYSTEM dùng instance_id = 0 (coi như singleton).
CREATE UNIQUE INDEX ux_contexts_type_instance ON contexts (type, instance_id);
CREATE INDEX ix_contexts_parent ON contexts (parent_context_id);

-- ---------------------------------------------------------------------
-- capabilities — quyền hạt nhân theo namespace (course:manage, quiz:regrade...)
-- ---------------------------------------------------------------------
CREATE TABLE capabilities (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(120) NOT NULL UNIQUE,   -- ví dụ: 'course:manage'
    description VARCHAR(255)
);

-- ---------------------------------------------------------------------
-- roles — gom nhóm capabilities (Admin / Teacher / Student / ...)
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shortname   VARCHAR(50)  NOT NULL UNIQUE,    -- 'admin' | 'teacher' | 'student'
    name        VARCHAR(120) NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- role_capabilities — role cấp (ALLOW) hoặc cấm (PREVENT) một capability.
--   PREVENT cho phép override khi kế thừa từ context cha.
-- ---------------------------------------------------------------------
CREATE TABLE role_capabilities (
    role_id       BIGINT      NOT NULL REFERENCES roles (id)        ON DELETE CASCADE,
    capability_id BIGINT      NOT NULL REFERENCES capabilities (id) ON DELETE CASCADE,
    permission    VARCHAR(10) NOT NULL DEFAULT 'ALLOW'
                  CHECK (permission IN ('ALLOW', 'PREVENT')),
    PRIMARY KEY (role_id, capability_id)
);

-- ---------------------------------------------------------------------
-- role_assignments — (user, role, context). Một user có thể có nhiều role
--   tại nhiều context khác nhau (Teacher ở Course A, Student ở Course B).
-- ---------------------------------------------------------------------
CREATE TABLE role_assignments (
    id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
    role_id    BIGINT      NOT NULL REFERENCES roles (id)    ON DELETE CASCADE,
    context_id BIGINT      NOT NULL REFERENCES contexts (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role_id, context_id)
);
CREATE INDEX ix_role_assignments_user ON role_assignments (user_id);
CREATE INDEX ix_role_assignments_context ON role_assignments (context_id);
