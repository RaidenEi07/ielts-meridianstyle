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
            Instant lastSubmittedAt,
            List<AttemptSummary> attemptList) {
    }

    /** Tóm tắt 1 lượt làm bài cụ thể — dùng để admin/giáo viên xem chi tiết. */
    public record AttemptSummary(
            Long attemptId,
            int attemptNumber,
            String status,
            Instant submittedAt,
            BigDecimal rawScore,
            BigDecimal maxScore,
            BigDecimal bandScore,
            int violations) {
    }

    /** Số câu đúng/sai theo từng dạng câu hỏi, gộp toàn bộ lịch sử làm bài của 1 học viên. */
    public record TypeBreakdown(String type, long correctCount, long wrongCount) {
    }

    /**
     * Số câu đúng/sai theo từng kỹ năng IELTS (READING/LISTENING/WRITING),
     * gộp toàn bộ lịch sử làm bài đã chấm của 1 học viên — suy ra kỹ năng từ
     * tên quiz (quy ước đặt tên nhất quán trong ngân hàng đề: "reading 36",
     * "listening 47", "writing 42 Task 1"...), không phải nhãn thủ công nên
     * không cần gắn tag cho từng câu hỏi.
     */
    public record SkillBreakdown(String skill, long correctCount, long wrongCount) {
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

    /** 1 dòng học viên trong sổ điểm CẢ KHÓA HỌC — khác GradebookRow (1 dòng =
     * 1 quiz của 1 học viên); ở đây gộp theo học viên trên toàn bộ đề trong
     * khóa, dùng cho màn "quản lý điểm 1 khóa học" (chọn khóa → thấy hết học
     * viên, không phải chọn học viên trước như sổ điểm cũ). */
    public record CourseGradebookStudentRow(
            UUID userId,
            String userName,
            String username,
            int quizzesAttempted,
            int totalQuizzes,
            BigDecimal avgPercent,
            BigDecimal bestBand,
            Instant lastActivity) {
    }

    /** 1 dòng đề thi trong sổ điểm cả khóa học — cùng số liệu với
     * QuizReportRow/QuizReportStats nhưng tính 1 lần cho MỌI đề trong khóa
     * (1 query attempts, nhóm theo quiz) thay vì gọi quizReport() lặp lại cho
     * từng đề — khóa nhiều đề (vd IELTS-PREP 150 đề) gọi kiểu đó sẽ rất chậm. */
    public record CourseGradebookQuizRow(
            Long quizId,
            String quizTitle,
            String sectionTitle,
            BigDecimal maxScore,
            long distinctStudents,
            long graded,
            BigDecimal avgScore,
            BigDecimal passRate) {
    }

    public record CourseGradebook(
            Long courseId,
            String courseTitle,
            long enrolledCount,
            long totalQuizzes,
            BigDecimal avgCompletionPercent,
            BigDecimal avgScorePercent,
            List<CourseGradebookStudentRow> students,
            List<CourseGradebookQuizRow> quizzes) {
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
