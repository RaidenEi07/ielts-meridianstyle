package com.meridian.catalog.dto;

import com.meridian.catalog.CourseAudienceGroup;
import com.meridian.catalog.CourseCategory;

public record CategoryDto(
        Long id,
        String name,
        String slug,
        String description,
        ExamTemplateSummary examTemplate,
        Long contextId,
        CourseAudienceGroup audienceGroup) {

    public static CategoryDto from(CourseCategory c) {
        return new CategoryDto(
                c.getId(),
                c.getName(),
                c.getSlug(),
                c.getDescription(),
                ExamTemplateSummary.from(c.getExamTemplate()),
                c.getContext() != null ? c.getContext().getId() : null,
                c.getAudienceGroup());
    }
}
