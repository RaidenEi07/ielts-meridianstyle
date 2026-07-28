package com.meridian.checkpoint.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import tools.jackson.databind.JsonNode;

public final class VideoCheckpointRequests {

    private VideoCheckpointRequests() {
    }

    public record ReplaceCheckpoints(List<CheckpointItem> checkpoints) {

        public record CheckpointItem(
                @NotNull(message = "timestampSec là bắt buộc") BigDecimal timestampSec,
                @NotNull(message = "questionId là bắt buộc") Long questionId,
                Integer sortOrder) {
        }
    }

    public record SubmitAnswer(JsonNode answer) {
    }
}
