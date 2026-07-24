package com.meridian.distribution.dto;

import java.util.List;

/** Kết quả nhận 1 khóa học được điều phối từ web tổng, theo phong cách {@code ImportSummaryDto}. */
public record CourseImportSummaryDto(
        int categoriesCreated,
        int categoriesReused,
        boolean courseCreated,
        int sectionsCreated,
        int sectionsReused,
        int quizzesCreated,
        int quizzesReused,
        int questionCategoriesCreated,
        int questionCategoriesReused,
        int passagesCreated,
        int passagesReused,
        int questionsCreated,
        int questionsReused,
        List<String> warnings) {
}
