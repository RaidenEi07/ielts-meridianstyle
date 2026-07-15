package com.meridian.recording.dto;

import java.time.Instant;

public record LessonRecordingDto(Long id, String audioUrl, Instant createdAt) {
}
