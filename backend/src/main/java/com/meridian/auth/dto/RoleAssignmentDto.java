package com.meridian.auth.dto;

import com.meridian.rbac.RoleAssignment;

public record RoleAssignmentDto(
        Long id,
        String roleShortname,
        String roleName,
        String contextType,
        Long contextId,
        Long instanceId) {

    public static RoleAssignmentDto from(RoleAssignment ra) {
        return new RoleAssignmentDto(
                ra.getId(),
                ra.getRole().getShortname(),
                ra.getRole().getName(),
                ra.getContext().getType().name(),
                ra.getContext().getId(),
                ra.getContext().getInstanceId());
    }
}
