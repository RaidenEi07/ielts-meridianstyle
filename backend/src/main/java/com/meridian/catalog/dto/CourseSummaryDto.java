package com.meridian.catalog.dto;

import com.meridian.catalog.Course;
import java.math.BigDecimal;

public record CourseSummaryDto(
        Long id,
        String title,
        String shortname,
        String summary,
        String status,
        String coverImageUrl,
        BigDecimal price,
        Long categoryId,
        String categoryName,
        long enrolledCount) {

    public static CourseSummaryDto from(Course c, long enrolledCount) {
        return new CourseSummaryDto(
                c.getId(),
                c.getTitle(),
                c.getShortname(),
                c.getSummary(),
                c.getStatus().name(),
                c.getCoverImageUrl(),
                c.getPrice(),
                c.getCategory().getId(),
                c.getCategory().getName(),
                enrolledCount);
    }
}
