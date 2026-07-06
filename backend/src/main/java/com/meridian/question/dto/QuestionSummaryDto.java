package com.meridian.question.dto;

import java.math.BigDecimal;
import java.util.List;

public record QuestionSummaryDto(
        Long id,
        String type,
        String name,
        Long categoryId,
        String categoryName,
        Long passageId,
        BigDecimal defaultMark,
        List<String> tags) {
}
