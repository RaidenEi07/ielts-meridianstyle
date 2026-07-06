package com.meridian.gradebook.dto;

import java.math.BigDecimal;

/** Một câu trả lời của thí sinh, hiển thị cho giáo viên chấm (kèm answerId). */
public record AnswerGradingDto(
        Long answerId,
        Long quizQuestionId,
        String type,
        String name,
        String response,
        BigDecimal mark,
        BigDecimal awardedMark,
        Boolean correct,
        boolean needsManualGrading) {
}
