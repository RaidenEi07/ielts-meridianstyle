package com.meridian.catalog.dto;

import com.meridian.catalog.CourseSection;

public record SectionDto(Long id, String title, int sortOrder, String videoUrl) {

    public static SectionDto from(CourseSection s) {
        return new SectionDto(s.getId(), s.getTitle(), s.getSortOrder(), s.getVideoUrl());
    }
}
