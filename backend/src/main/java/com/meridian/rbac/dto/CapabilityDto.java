package com.meridian.rbac.dto;

import com.meridian.rbac.Capability;

public record CapabilityDto(String name, String description) {

    public static CapabilityDto from(Capability capability) {
        return new CapabilityDto(capability.getName(), capability.getDescription());
    }
}
