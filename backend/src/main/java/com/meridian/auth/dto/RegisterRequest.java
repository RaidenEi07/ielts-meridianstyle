package com.meridian.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Tên đăng nhập là bắt buộc")
        @Pattern(
                regexp = "^[a-zA-Z0-9._]{3,50}$",
                message = "Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới (3-50 ký tự)")
        String username,

        @NotBlank(message = "Email là bắt buộc")
        @Email(message = "Email không hợp lệ")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        @NotBlank(message = "Mật khẩu là bắt buộc")
        // 72 = giới hạn của bcrypt (byte thừa bị cắt âm thầm); chặn sớm để khỏi băm chuỗi dài vô nghĩa.
        @Size(min = 8, max = 72, message = "Mật khẩu từ 8 đến 72 ký tự")
        String password,

        @NotBlank(message = "Họ tên là bắt buộc")
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
        String fullName) {
}
