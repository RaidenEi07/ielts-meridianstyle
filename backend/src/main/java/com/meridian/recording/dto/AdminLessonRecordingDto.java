package com.meridian.recording.dto;

import java.time.Instant;
import java.util.UUID;

/** Bản ghi âm cho giáo viên xem/chấm — kèm tên học viên, khác DTO tự xem của học viên. */
public record AdminLessonRecordingDto(
        Long id,
        UUID userId,
        String userFullName,
        String audioUrl,
        Integer starRating,
        Instant createdAt) {
}
