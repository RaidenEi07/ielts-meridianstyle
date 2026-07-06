package com.meridian.rbac.dto;

import com.meridian.auth.dto.RoleAssignmentDto;
import com.meridian.user.User;
import java.util.List;
import java.util.UUID;

/** User kèm danh sách role assignment hiện tại — dùng cho trang quản trị tài khoản. */
public record AdminUserDto(
        UUID id,
        String username,
        String email,
        String fullName,
        String status,
        List<RoleAssignmentDto> roleAssignments) {

    public static AdminUserDto from(User user, List<RoleAssignmentDto> roleAssignments) {
        return new AdminUserDto(user.getId(), user.getUsername(), user.getEmail(),
                user.getFullName(), user.getStatus().name(), roleAssignments);
    }
}
