package com.meridian.gradebook.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** DTO cho sổ điểm và báo cáo. */
public final class ReportDtos {

    private ReportDtos() {
    }

    /** Một dòng trong sổ điểm của học viên. */
    public record GradebookRow(
            Long quizId,
            String quizTitle,
            Long courseId,
            String courseName,
            BigDecimal bestScore,
            BigDecimal maxScore,
            BigDecimal bandScore,
            String status,
            int attempts,
            Instant lastSubmittedAt) {
    }

    public record QuizReportStats(
            long totalAttempts,
            long distinctStudents,
            long graded,
            BigDecimal avgScore,
            BigDecimal maxScore,
            BigDecimal minScore,
            BigDecimal passRate,
            BigDecimal avgViolations) {
    }

    public record QuizReportRow(
            UUID userId,
            String userName,
            int attempts,
            BigDecimal bestScore,
            BigDecimal bandScore,
            String status,
            int violations) {
    }

    public record QuizReport(
            Long quizId,
            String quizTitle,
            BigDecimal maxScore,
            QuizReportStats stats,
            List<QuizReportRow> rows) {
    }

    public record MonthlyPoint(String month, long enrollments, BigDecimal revenue) {
    }

    public record SystemAnalytics(
            long totalUsers,
            long totalCourses,
            long totalEnrollments,
            long totalQuizzes,
            long totalAttempts,
            BigDecimal totalRevenue,
            List<MonthlyPoint> monthly) {
    }
}
