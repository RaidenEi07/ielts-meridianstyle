package com.meridian.quiz.dto;

import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

public final class AttemptRequests {

    private AttemptRequests() {
    }

    public record SaveAnswer(
            @NotNull(message = "quizQuestionId là bắt buộc") Long quizQuestionId,
            JsonNode response) {
    }

    public record LogEvent(
            @NotNull(message = "eventType là bắt buộc") String eventType,
            String detail) {
    }

    public record OverrideAttempt(Integer extraSeconds) {
    }
}
