package com.meridian.rbac.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Admin tạo tài khoản trực tiếp. Khác với đăng ký công khai (luôn gán role
 * "student"), roleShortname ở đây tùy chọn — để trống nghĩa là tạo tài khoản
 * chưa có vai trò nào, gán sau qua /api/admin/role-assignments.
 */
public record CreateUserRequest(
        @NotBlank(message = "Tên đăng nhập là bắt buộc")
        @Pattern(
                regexp = "^[a-zA-Z0-9._]{3,50}$",
                message = "Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới (3-50 ký tự)")
        String username,

        @NotBlank(message = "Email là bắt buộc")
        @Email(message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Mật khẩu là bắt buộc")
        @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự")
        String password,

        @NotBlank(message = "Họ tên là bắt buộc")
        String fullName,

        String roleShortname) {
}
