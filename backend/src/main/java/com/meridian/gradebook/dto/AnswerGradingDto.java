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
        boolean answered,
        /** Đề bài (HTML) — dùng cho màn "xem đề & đáp án" và xuất PDF, không
         * chỉ hiện tên/nhãn ngắn như {@code name}. */
        String stem,
        /** Đáp án đúng, dạng văn bản đọc được — null với Essay (chấm tay, không
         * có đáp án cố định) hoặc khi câu hỏi không khai báo đáp án đúng. */
        String correctAnswerText,
        /** Câu trả lời của học sinh, dạng văn bản đọc được (đã diễn giải từ
         * response JSON theo đúng cấu trúc từng dạng câu hỏi — xem
         * AnswerDisplayService, dùng lại cách đọc field của GradingService).
         * Null khi học sinh bỏ trống. */
        String studentAnswerText) {
}
