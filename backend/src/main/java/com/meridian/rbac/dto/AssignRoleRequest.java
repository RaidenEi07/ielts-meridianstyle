package com.meridian.rbac.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Gán role cho user tại một context. contextId để trống = SYSTEM context.
 */
public record AssignRoleRequest(
        @NotNull(message = "userId là bắt buộc") UUID userId,
        @NotBlank(message = "roleShortname là bắt buộc") String roleShortname,
        Long contextId) {
}
