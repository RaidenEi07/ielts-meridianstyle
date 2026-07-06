package com.meridian.rbac.dto;

import com.meridian.rbac.Role;

public record RoleDto(Long id, String shortname, String name, String description) {

    public static RoleDto from(Role role) {
        return new RoleDto(role.getId(), role.getShortname(), role.getName(),
                role.getDescription());
    }
}
