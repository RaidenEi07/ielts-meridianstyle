-- Logo trung tâm: URL ảnh đã tải lên qua /api/admin/media/images (rỗng = chưa có logo, giao diện
-- dùng huy hiệu chữ cái đầu như cũ) và tùy chọn "chỉ hiện logo", ẩn tên ghi bên cạnh (cho logo đã có chữ).
INSERT INTO web_configurations (config_key, value) VALUES
    ('SITE_LOGO_URL',       ''),
    ('SITE_LOGO_HIDE_NAME', 'false')
ON CONFLICT (config_key) DO NOTHING;
