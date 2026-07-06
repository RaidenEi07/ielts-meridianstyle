package com.meridian.security;

import java.util.UUID;

/**
 * Principal đặt vào SecurityContext sau khi xác thực access token thành công.
 * Quyền hạn (capability) KHÔNG nằm trong token — luôn được phân giải từ DB
 * theo context tại thời điểm kiểm tra (xem PermissionService).
 */
public record AuthenticatedUser(UUID id, String username, String email, String fullName) {
}
