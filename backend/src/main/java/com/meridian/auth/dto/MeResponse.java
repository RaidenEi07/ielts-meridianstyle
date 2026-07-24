package com.meridian.auth.dto;

import java.util.List;

/**
 * Thông tin người dùng hiện tại kèm danh sách role được gán (theo context)
 * và tập capability hiệu lực tại SYSTEM context.
 *
 * {@code isMaster} phân biệt deployment này là "web tổng" hay "web con" —
 * đọc từ biến môi trường SITE_ROLE (không phải cấu hình runtime, cố ý:
 * đổi vai trò deployment là việc nhạy cảm, chỉ nên đặt lúc deploy, không
 * để lộ ra 1 dropdown có thể bấm nhầm trong trang Cấu hình hệ thống).
 */
public record MeResponse(
        UserDto user,
        List<RoleAssignmentDto> roleAssignments,
        List<String> systemCapabilities,
        boolean isMaster) {
}
