package com.meridian.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public final class EnrollmentRequests {

    private EnrollmentRequests() {
    }

    public record Enroll(@NotNull(message = "courseId là bắt buộc") Long courseId) {
    }

    public record UpdateProgress(
            @NotNull @Min(0) @Max(100) Integer progressPct,
            String status) {
    }
}
