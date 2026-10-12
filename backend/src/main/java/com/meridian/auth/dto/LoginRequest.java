package com.meridian.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Tên đăng nhập là bắt buộc") @Size(max = 255, message = "Tên đăng nhập quá dài") String username,
        @NotBlank(message = "Mật khẩu là bắt buộc") @Size(max = 200, message = "Mật khẩu quá dài") String password) {
}
