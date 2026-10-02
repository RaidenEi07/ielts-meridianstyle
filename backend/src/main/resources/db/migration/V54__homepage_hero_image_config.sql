-- Ảnh đầu trang chủ (ô ảnh bên phải tiêu đề): URL ảnh đã tải lên qua /api/admin/media/images.
-- Rỗng = chưa có ảnh, trang chủ giữ họa tiết sọc mẫu như cũ.
INSERT INTO web_configurations (config_key, value) VALUES
    ('HOMEPAGE_HERO_IMAGE_URL', '')
ON CONFLICT (config_key) DO NOTHING;
