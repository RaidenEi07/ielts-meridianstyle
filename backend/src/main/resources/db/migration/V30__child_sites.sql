-- =====================================================================
-- V30 — Sổ quản lý web con (Lát 2 của mô hình "web tổng / web con").
--   Chỉ web tổng dùng bảng này: mỗi dòng là 1 web con đã đăng ký, kèm
--   API key riêng để web tổng xác thực khi đẩy khóa học sang (Lát 3/4).
-- =====================================================================

CREATE TABLE child_sites (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    base_url    VARCHAR(300) NOT NULL,
    api_key     VARCHAR(100) NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT true,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
