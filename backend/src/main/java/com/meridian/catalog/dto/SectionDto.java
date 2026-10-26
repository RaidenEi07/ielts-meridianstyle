package com.meridian.catalog.dto;

import com.meridian.catalog.CourseSection;

public record SectionDto(Long id, String title, int sortOrder, String videoUrl, String subtitleUrl,
        String shortDescription, boolean hidden) {

    public static SectionDto from(CourseSection s) {
        return new SectionDto(s.getId(), s.getTitle(), s.getSortOrder(), s.getVideoUrl(),
                s.getSubtitleUrl(), s.getShortDescription(), s.isHidden());
    }

    /** Chỉ phần đề cương (tên, mô tả ngắn) — dùng khi người xem chưa được ghi danh khóa này. */
    public SectionDto outline() {
        return new SectionDto(id, title, sortOrder, null, null, shortDescription, hidden);
    }
}
