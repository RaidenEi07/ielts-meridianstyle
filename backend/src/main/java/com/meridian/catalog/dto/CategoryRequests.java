package com.meridian.catalog.dto;

import com.meridian.catalog.CourseAudienceGroup;
import jakarta.validation.constraints.NotBlank;

/** Gom các request body cho Category. */
public final class CategoryRequests {

    private CategoryRequests() {
    }

    public record Create(
            @NotBlank(message = "Tên danh mục là bắt buộc") String name,
            String slug,
            String description,
            String examTemplateCode,
            CourseAudienceGroup audienceGroup) {
    }

    public record Update(
            String name,
            String description,
            String examTemplateCode,
            CourseAudienceGroup audienceGroup) {
    }
}
