package com.meridian.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "refreshToken là bắt buộc") String refreshToken) {
}
