package com.meridian.checkpoint.dto;

public record CheckpointAnswerResultDto(Long checkpointId, Boolean correct, boolean autoGraded) {
}
