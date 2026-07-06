package com.meridian.catalog.dto;

import com.meridian.catalog.Course;
import java.math.BigDecimal;
import java.util.List;

public record CourseDetailDto(
        Long id,
        String title,
        String shortname,
        String summary,
        String status,
        String coverImageUrl,
        BigDecimal price,
        Long categoryId,
        String categoryName,
        String examTemplateCode,
        Long contextId,
        long enrolledCount,
        List<SectionDto> sections) {

    public static CourseDetailDto from(Course c, long enrolledCount, List<SectionDto> sections) {
        var template = c.getCategory().getExamTemplate();
        return new CourseDetailDto(
                c.getId(),
                c.getTitle(),
                c.getShortname(),
                c.getSummary(),
                c.getStatus().name(),
                c.getCoverImageUrl(),
                c.getPrice(),
                c.getCategory().getId(),
                c.getCategory().getName(),
                template != null ? template.getCode() : null,
                c.getContext() != null ? c.getContext().getId() : null,
                enrolledCount,
                sections);
    }
}
