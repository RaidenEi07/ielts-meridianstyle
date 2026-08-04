package com.meridian.gradebook.dto;

import java.math.BigDecimal;

/**
 * Một câu trả lời của thí sinh, hiển thị cho giáo viên chấm (kèm answerId).
 * Khi {@code answered} là false, câu này không có trong bảng
 * quiz_attempt_answers (thí sinh bỏ trống) — answerId null, không thể chấm tay.
 */
public record AnswerGradingDto(
        Long answerId,
        Long quizQuestionId,
        String type,
        String name,
        String response,
        BigDecimal mark,
        BigDecimal awardedMark,
        Boolean correct,
        boolean needsManualGrading,
        boolean answered) {
}
