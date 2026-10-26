package com.meridian.rbac.dto;

/** updated = số tài khoản đã đổi; skippedSelf = 1 nếu người thao tác có trong danh sách (không tự khóa mình). */
public record BulkStatusResult(int updated, int skippedSelf, int notFound) {
}
