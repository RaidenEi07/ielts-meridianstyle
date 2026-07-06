package com.meridian.rbac;

/**
 * Projection: một capability được cấp/cấm cho user tại một context cụ thể.
 * Dùng để phân giải quyền hiệu lực có kế thừa theo cây context.
 */
public interface CapabilityGrant {

    Long getContextId();

    String getCapabilityName();

    Permission getPermission();
}
