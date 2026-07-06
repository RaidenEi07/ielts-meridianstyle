package com.meridian.auth.dto;

import java.util.List;

/**
 * Thông tin người dùng hiện tại kèm danh sách role được gán (theo context)
 * và tập capability hiệu lực tại SYSTEM context.
 */
public record MeResponse(
        UserDto user,
        List<RoleAssignmentDto> roleAssignments,
        List<String> systemCapabilities) {
}
