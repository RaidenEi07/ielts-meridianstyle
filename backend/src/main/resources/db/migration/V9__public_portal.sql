-- =====================================================================
-- V9 — Public Portal (Giai đoạn 7)
-- Hồ sơ giáo viên (hiển thị trang chủ) + phiếu tư vấn (lead capture).
-- =====================================================================

-- ---------------------------------------------------------------------
-- teacher_profiles — thông tin công khai của giáo viên
-- ---------------------------------------------------------------------
CREATE TABLE teacher_profiles (
    id               BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          UUID         NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    headline         VARCHAR(200),
    bio              TEXT,
    avatar_url       VARCHAR(500),
    years_experience INT          NOT NULL DEFAULT 0,
    featured         BOOLEAN      NOT NULL DEFAULT false,
    sort_order       INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- contact_inquiries — phiếu đăng ký tư vấn từ trang công khai
-- ---------------------------------------------------------------------
CREATE TABLE contact_inquiries (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(40),
    message    TEXT,
    status     VARCHAR(20)  NOT NULL DEFAULT 'NEW'
               CHECK (status IN ('NEW', 'CONTACTED', 'CLOSED')),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_inquiries_status ON contact_inquiries (status, created_at DESC);
