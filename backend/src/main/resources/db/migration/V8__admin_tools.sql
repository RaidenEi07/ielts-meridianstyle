-- =====================================================================
-- V8 — Công cụ Quản trị (Giai đoạn 6)
-- Cấu hình site (key-value), thông báo hệ thống, notification cá nhân.
-- =====================================================================

-- ---------------------------------------------------------------------
-- web_configurations — cấu hình dạng key-value (branding, theme, bảo mật...)
-- ---------------------------------------------------------------------
CREATE TABLE web_configurations (
    config_key VARCHAR(80)  PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by UUID         REFERENCES users (id) ON DELETE SET NULL
);

INSERT INTO web_configurations (config_key, value) VALUES
    ('SITE_NAME',        'Anh ngữ Meridian'),
    ('SITE_TAGLINE',     'Luyện thi IELTS theo chuẩn phòng thi máy'),
    ('SITE_LANGUAGE',    'vi'),
    ('SITE_THEME_MODE',  'system'),
    ('PRIMARY_COLOR',    '#1E3A5F'),
    ('ACCENT_COLOR',     '#C2691D'),
    ('SUPPORT_EMAIL',    'lienhe@meridian.edu.vn'),
    ('CACHE_TTL',        '300'),
    ('SSL_FORCE_HTTPS',  'false'),
    ('REGISTRATION_OPEN','true');

-- ---------------------------------------------------------------------
-- system_announcements — thông báo toàn hệ thống (banner)
-- ---------------------------------------------------------------------
CREATE TABLE system_announcements (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    level      VARCHAR(20)  NOT NULL DEFAULT 'INFO'
               CHECK (level IN ('INFO', 'WARNING', 'CRITICAL')),
    active     BOOLEAN      NOT NULL DEFAULT true,
    created_by UUID         REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- notifications — thông báo cá nhân theo user
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    link       VARCHAR(500),
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_user ON notifications (user_id, read_at);
