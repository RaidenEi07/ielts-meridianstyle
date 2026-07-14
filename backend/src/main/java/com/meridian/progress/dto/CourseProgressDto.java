package com.meridian.progress.dto;

import java.util.Set;

public record CourseProgressDto(Set<Long> completedSectionIds) {
}
