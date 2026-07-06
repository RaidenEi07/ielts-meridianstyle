package com.meridian.question.dto;

import java.util.List;

/** Kết quả sau khi nhập 1 gói ngân hàng câu hỏi (.zip). */
public record ImportSummaryDto(
        int categoriesCreated,
        int categoriesReused,
        int passagesCreated,
        int passagesReused,
        int tagsCreated,
        int tagsReused,
        int questionsCreated,
        int questionsSkippedDuplicate,
        List<String> warnings) {
}
