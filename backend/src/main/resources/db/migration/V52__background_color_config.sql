-- Ô "Màu nền" trong Cấu hình hệ thống: 1 màu nền, giao diện tự sinh cả bộ nền khung/viền/chữ từ nó.
-- Giá trị mặc định = màu nền hiện tại của giao diện nên chưa thay đổi gì cho tới khi admin đổi.
INSERT INTO web_configurations (config_key, value) VALUES
    ('BACKGROUND_COLOR', '#FBF8F3')
ON CONFLICT (config_key) DO NOTHING;
