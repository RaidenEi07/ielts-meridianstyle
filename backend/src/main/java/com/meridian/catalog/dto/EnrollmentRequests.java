package com.meridian.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public final class EnrollmentRequests {

    private EnrollmentRequests() {
    }

    public record Enroll(@NotNull(message = "courseId là bắt buộc") Long courseId) {
    }

    public record BulkEnroll(
            @NotEmpty(message = "Chưa chọn tài khoản nào")
            @Size(max = 2000, message = "Mỗi lần ghi danh tối đa 2000 tài khoản") List<UUID> userIds,
            @NotNull(message = "courseId là bắt buộc") Long courseId) {
    }

    public record UpdateProgress(
            @NotNull @Min(0) @Max(100) Integer progressPct,
            String status) {
    }
}
