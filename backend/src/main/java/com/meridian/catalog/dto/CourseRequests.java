package com.meridian.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/** Gom các request body cho Course và Section. */
public final class CourseRequests {

    private CourseRequests() {
    }

    public record CreateCourse(
            @NotNull(message = "categoryId là bắt buộc") Long categoryId,
            @NotBlank(message = "Tiêu đề là bắt buộc") String title,
            @NotBlank(message = "shortname là bắt buộc") String shortname,
            String summary,
            String coverImageUrl,
            BigDecimal price,
            String status) {
    }

    public record UpdateCourse(
            Long categoryId,
            String title,
            String summary,
            String coverImageUrl,
            BigDecimal price,
            String status) {
    }

    public record CreateSection(
            @NotBlank(message = "Tiêu đề section là bắt buộc") String title,
            Integer sortOrder,
            String videoUrl,
            String subtitleUrl) {
    }

    public record UpdateSection(String title, Integer sortOrder, String videoUrl, String subtitleUrl) {
    }

    public record ReorderSections(@NotEmpty(message = "sectionIds không được rỗng") List<Long> sectionIds) {
    }
}
