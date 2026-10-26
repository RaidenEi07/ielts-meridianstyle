package com.meridian.rbac.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/** Khóa / mở khóa nhiều tài khoản cùng lúc. status chỉ nhận ACTIVE hoặc SUSPENDED. */
public record BulkStatusRequest(
        @NotEmpty(message = "Chưa chọn tài khoản nào")
        @Size(max = 2000, message = "Mỗi lần chỉ xử lý tối đa 2000 tài khoản") List<UUID> userIds,
        @NotBlank(message = "Trạng thái là bắt buộc") String status) {
}
