-- =====================================================================
-- V11 — Khôi phục cấu hình site mặc định.
--   V8 đã INSERT các dòng này, nhưng vì đó là seed một-lần trong migration
--   (không phải CommandLineRunner), nếu bảng bị xóa dữ liệu vì lý do khác
--   (vd TRUNCATE thủ công khi dev) thì Flyway sẽ KHÔNG tự chèn lại — V8 đã
--   được đánh dấu "applied" nên không chạy lại. Dùng ON CONFLICT DO NOTHING
--   để migration này an toàn chạy trên mọi môi trường (kể cả nơi V8 vẫn còn
--   nguyên dữ liệu).
-- =====================================================================

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
    ('REGISTRATION_OPEN','true')
ON CONFLICT (config_key) DO NOTHING;
