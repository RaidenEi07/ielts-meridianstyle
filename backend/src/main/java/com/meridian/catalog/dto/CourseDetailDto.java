package com.meridian.catalog.dto;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseAudienceGroup;
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
        CourseAudienceGroup audienceGroup,
        String examTemplateCode,
        Long contextId,
        long enrolledCount,
        List<SectionDto> sections,
        String descriptionHtml,
        List<String> objectives,
        String prerequisites,
        /** Người xem có được xem nội dung học (video, tài liệu…) hay chỉ xem giới thiệu + đề cương. */
        boolean canAccessContent) {

    public static CourseDetailDto from(Course c, long enrolledCount, List<SectionDto> sections,
            List<String> objectives) {
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
                c.getCategory().getAudienceGroup(),
                template != null ? template.getCode() : null,
                c.getContext() != null ? c.getContext().getId() : null,
                enrolledCount,
                sections,
                c.getDescriptionHtml(),
                objectives,
                c.getPrerequisites(),
                true);
    }

    /** Bản cho người chưa được ghi danh: giữ giới thiệu + tên các buổi, bỏ đường dẫn video / phụ đề. */
    public CourseDetailDto outlineOnly() {
        return new CourseDetailDto(id, title, shortname, summary, status, coverImageUrl, price, categoryId,
                categoryName, audienceGroup, examTemplateCode, contextId, enrolledCount,
                sections.stream().map(SectionDto::outline).toList(), descriptionHtml, objectives,
                prerequisites, false);
    }
}
