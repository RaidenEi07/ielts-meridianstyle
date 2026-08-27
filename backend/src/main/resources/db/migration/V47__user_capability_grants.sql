-- =====================================================================
-- V47 — Gán quyền LẺ trực tiếp cho 1 tài khoản tại 1 context cụ thể (thường
--   là 1 khóa học), KHÔNG qua role. Đáp ứng đúng yêu cầu: "từng tài khoản có
--   chức năng khác nhau" + "khác nhau theo từng khóa học" — role hiện có
--   (teacher/manager...) vẫn giữ nguyên cho trường hợp cần bộ quyền giống
--   nhau ở mọi nơi (gán tại SYSTEM context như xưa nay), bảng này là lối
--   BỔ SUNG cho trường hợp cần tùy biến mịn hơn, không thay thế role.
--
--   Tái dùng NGUYÊN mô hình phân giải quyền có sẵn ở PermissionService
--   (getEffectiveCapabilities đi qua cây context, context cụ thể nhất
--   thắng) — chỉ cần nạp thêm 1 nguồn "grant" thứ 2 (ngoài
--   role_assignments JOIN role_capabilities) là mọi endpoint đang gọi
--   requireCapability(user, cap, contextIdOf(course.getContext())) xuyên
--   suốt codebase (CatalogService/QuizService/GradingAdminService/
--   VocabService...) tự động tôn trọng quyền lẻ này, không cần sửa gì ở
--   ~50 chỗ gọi permission check hiện có.
--
--   v1 chỉ hỗ trợ ALLOW (permission luôn 'ALLOW') — cấp thêm quyền, không
--   dùng để CẤM bớt quyền role đang cấp rộng hơn (PREVENT để dành sau nếu
--   cần, cột permission vẫn giữ để không phải đổi schema lần 2).
-- =====================================================================

CREATE TABLE user_capability_grants (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    capability_id  BIGINT      NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    context_id     BIGINT      NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    permission     VARCHAR(10) NOT NULL DEFAULT 'ALLOW' CHECK (permission IN ('ALLOW', 'PREVENT')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (user_id, capability_id, context_id)
);

CREATE INDEX ix_user_capability_grants_user ON user_capability_grants(user_id);
CREATE INDEX ix_user_capability_grants_context ON user_capability_grants(context_id);
