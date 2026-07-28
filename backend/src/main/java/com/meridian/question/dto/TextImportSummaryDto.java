package com.meridian.question.dto;

import java.util.List;

/** Kết quả sau khi nhập nhanh câu hỏi Trắc nghiệm (MCQ) từ văn bản thô. */
public record TextImportSummaryDto(
        int questionsCreated,
        List<BlockError> errors) {

    public record BlockError(int blockIndex, String excerpt, String reason) {
    }
}
