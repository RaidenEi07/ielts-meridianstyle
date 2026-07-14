package com.meridian.family.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateChildRequest(
        @NotBlank(message = "Tên hồ sơ con là bắt buộc")
        @Size(max = 255, message = "Tên tối đa 255 ký tự")
        String fullName) {
}
