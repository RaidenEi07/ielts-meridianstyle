package com.meridian.quiz.dto;

import java.math.BigDecimal;
import java.util.List;

/** Các DTO phản hồi cho quản lý quiz. */
public final class QuizDtos {

    private QuizDtos() {
    }

    public record QuizDto(
            Long id,
            Long sectionId,
            Long courseId,
            String title,
            String intro,
            Integer timeLimitSeconds,
            int maxAttempts,
            boolean shuffleQuestions,
            boolean antiCheatEnabled,
            int maxViolations,
            BigDecimal passMark,
            String status,
            Long contextId,
            long questionCount,
            String examTemplateCode) {
    }

    public record QuizQuestionDto(
            Long quizQuestionId,
            Long questionId,
            String type,
            String name,
            BigDecimal mark,
            Long pageId,
            int sortOrder) {
    }

    public record QuizPageDto(Long id, int pageNumber, String partLabel, Long passageId) {
    }

    /** Chi tiết quiz cho giáo viên (kèm câu hỏi + page). */
    public record QuizDetailDto(
            QuizDto quiz,
            List<QuizPageDto> pages,
            List<QuizQuestionDto> questions) {
    }
}
