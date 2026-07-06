package com.meridian.question;

/**
 * 8 loại câu hỏi chính (mục 4 của Kế hoạch V3). Audio và Pagination KHÔNG phải
 * loại câu hỏi mà là thuộc tính hỗ trợ (passage + cấu hình quiz).
 */
public enum QuestionType {
    MULTIPLE_CHOICE,
    TRUE_FALSE_NOT_GIVEN,
    MATCHING,
    SHORT_ANSWER,
    ESSAY,
    DRAG_DROP_TEXT,
    DRAG_DROP_MARKER,
    CLOZE
}
