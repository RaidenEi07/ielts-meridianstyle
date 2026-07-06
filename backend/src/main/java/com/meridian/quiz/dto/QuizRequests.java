package com.meridian.quiz.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public final class QuizRequests {

    private QuizRequests() {
    }

    public record CreateQuiz(
            @NotNull(message = "sectionId là bắt buộc") Long sectionId,
            @NotBlank(message = "Tiêu đề là bắt buộc") String title,
            String intro,
            Integer timeLimitSeconds,
            Integer maxAttempts,
            Boolean shuffleQuestions,
            Boolean antiCheatEnabled,
            Integer maxViolations,
            BigDecimal passMark,
            String status) {
    }

    public record UpdateQuiz(
            String title,
            String intro,
            Integer timeLimitSeconds,
            Integer maxAttempts,
            Boolean shuffleQuestions,
            Boolean antiCheatEnabled,
            Integer maxViolations,
            BigDecimal passMark,
            String status) {
    }

    public record ImportQuestions(
            @NotNull(message = "questionIds là bắt buộc") List<Long> questionIds,
            Long pageId,
            BigDecimal mark) {
    }

    public record SetPage(
            @NotNull Integer pageNumber, String partLabel, Long passageId) {
    }

    public record ReorderQuizzes(
            @NotEmpty(message = "quizIds không được rỗng") List<Long> quizIds) {
    }

    public record ReorderQuestions(
            @NotEmpty(message = "quizQuestionIds không được rỗng") List<Long> quizQuestionIds) {
    }
}
