package com.meridian.rbac;

/**
 * Một role có thể ALLOW (cấp) hoặc PREVENT (cấm) một capability.
 * PREVENT ở context con sẽ override ALLOW kế thừa từ context cha.
 */
public enum Permission {
    ALLOW,
    PREVENT
}
