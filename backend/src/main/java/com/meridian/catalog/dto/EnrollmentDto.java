package com.meridian.catalog.dto;

import com.meridian.catalog.Enrollment;
import java.time.Instant;

public record EnrollmentDto(
        Long id,
        Long courseId,
        String courseTitle,
        String status,
        int progressPct,
        Instant enrolledAt) {

    public static EnrollmentDto from(Enrollment e) {
        return new EnrollmentDto(
                e.getId(),
                e.getCourse().getId(),
                e.getCourse().getTitle(),
                e.getStatus().name(),
                e.getProgressPct(),
                e.getEnrolledAt());
    }
}
