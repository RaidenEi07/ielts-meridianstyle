package com.meridian.family.dto;

import java.time.Instant;
import java.util.List;

public record ChildProgressDto(
        int totalLessonsCompleted,
        Double averageScorePct,
        List<WeeklyLessonPoint> weeklyLessons,
        List<RecentLessonDto> recentLessons) {

    public record WeeklyLessonPoint(String weekStart, long count) {
    }

    public record RecentLessonDto(String sectionTitle, String courseTitle, Instant completedAt) {
    }
}
