package com.meridian.recommendation;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseAudienceGroup;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseStatus;
import com.meridian.catalog.Enrollment;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.catalog.dto.CourseSummaryDto;
import com.meridian.gradebook.ReportService;
import com.meridian.gradebook.dto.ReportDtos.GradebookRow;
import com.meridian.gradebook.dto.ReportDtos.SkillBreakdown;
import com.meridian.recommendation.dto.RecommendedCoursesDto;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gợi ý khóa học bản đơn giản (v1): dùng đúng 2 tín hiệu đã có sẵn — nhóm đối
 * tượng (audienceGroup) của khóa đã ghi danh/đã làm bài, và band score trung
 * bình gần đây — chưa cần gắn nhãn kỹ năng (Nghe/Đọc/Viết/Nói) cho câu hỏi.
 */
@Service
public class RecommendationService {

    private static final int LIMIT = 5;
    /** Cần ít nhất chừng này câu đã làm ở 1 kỹ năng mới coi là đủ tin cậy để
     * gọi là "yếu" — tránh 1-2 câu sai đầu tiên đã vội kết luận. */
    private static final long MIN_SKILL_SAMPLE = 4;

    private static final Map<String, String> SKILL_LABELS = Map.of(
            "LISTENING", "Nghe",
            "READING", "Đọc",
            "WRITING", "Viết",
            "SPEAKING", "Nói");

    private final ReportService reportService;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;

    public RecommendationService(ReportService reportService,
            EnrollmentRepository enrollmentRepository, CourseRepository courseRepository) {
        this.reportService = reportService;
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
    }

    @Transactional(readOnly = true)
    public RecommendedCoursesDto recommendedCoursesFor(UUID userId) {
        List<Enrollment> enrollments = enrollmentRepository.findByUserIdOrderByEnrolledAtDesc(userId);
        Set<Long> enrolledCourseIds = new LinkedHashSet<>();
        Set<CourseAudienceGroup> groups = new LinkedHashSet<>();
        for (Enrollment e : enrollments) {
            enrolledCourseIds.add(e.getCourse().getId());
            CourseAudienceGroup g = e.getCourse().getCategory().getAudienceGroup();
            if (g != null) {
                groups.add(g);
            }
        }

        List<GradebookRow> rows = reportService.gradebookForUser(userId, null);
        BigDecimal averageBandScore = averageBandScore(rows);
        for (GradebookRow row : rows) {
            courseRepository.findById(row.courseId()).ifPresent(c -> {
                CourseAudienceGroup g = c.getCategory().getAudienceGroup();
                if (g != null) {
                    groups.add(g);
                }
            });
        }

        List<SkillBreakdown> skillBreakdown = reportService.skillBreakdownForUser(userId);
        String weakestSkill = weakestSkill(skillBreakdown);

        String note;
        List<Course> candidates;
        if (groups.isEmpty()) {
            candidates = popularPublished(enrolledCourseIds);
            note = "Bạn chưa có lượt học nào — đây là các khóa học phổ biến để bắt đầu.";
        } else {
            candidates = coursesInGroups(groups, enrolledCourseIds);
            if (candidates.isEmpty()) {
                candidates = popularPublished(enrolledCourseIds);
            }
            note = weakestSkill != null
                    ? buildWeakestSkillNote(weakestSkill, skillBreakdown)
                    : "Gợi ý dựa trên nhóm khóa học bạn đang học — chưa đủ dữ liệu để phân tích theo kỹ năng.";
        }

        List<CourseSummaryDto> summaries = candidates.stream()
                .map(c -> CourseSummaryDto.from(c, enrollmentRepository.countByCourseId(c.getId())))
                .toList();
        return new RecommendedCoursesDto(summaries, averageBandScore, note, skillBreakdown, weakestSkill);
    }

    /** Kỹ năng có tỷ lệ sai cao nhất trong số các kỹ năng đã có đủ mẫu
     * ({@link #MIN_SKILL_SAMPLE}) — null nếu chưa kỹ năng nào đủ dữ liệu. */
    private String weakestSkill(List<SkillBreakdown> breakdown) {
        return breakdown.stream()
                .filter(b -> b.correctCount() + b.wrongCount() >= MIN_SKILL_SAMPLE)
                .max(Comparator.comparingDouble(
                        b -> (double) b.wrongCount() / (b.correctCount() + b.wrongCount())))
                .map(SkillBreakdown::skill)
                .orElse(null);
    }

    private String buildWeakestSkillNote(String weakestSkill, List<SkillBreakdown> breakdown) {
        SkillBreakdown b = breakdown.stream().filter(x -> x.skill().equals(weakestSkill)).findFirst().orElseThrow();
        long total = b.correctCount() + b.wrongCount();
        String label = SKILL_LABELS.getOrDefault(weakestSkill, weakestSkill);
        return String.format(
                "Bạn đang yếu nhất ở kỹ năng %s (sai %d/%d câu gần đây) — ưu tiên luyện tập phần này.",
                label, b.wrongCount(), total);
    }

    private BigDecimal averageBandScore(List<GradebookRow> rows) {
        List<BigDecimal> bandScores = rows.stream()
                .map(GradebookRow::bandScore)
                .filter(java.util.Objects::nonNull)
                .toList();
        if (bandScores.isEmpty()) {
            return null;
        }
        BigDecimal sum = bandScores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(bandScores.size()), 1, RoundingMode.HALF_UP);
    }

    private List<Course> coursesInGroups(Set<CourseAudienceGroup> groups, Set<Long> excludeIds) {
        Map<Long, Course> byId = new LinkedHashMap<>();
        for (CourseAudienceGroup g : groups) {
            for (Course c : courseRepository
                    .findByCategory_AudienceGroupAndStatusOrderByCreatedAtDesc(g, CourseStatus.PUBLISHED)) {
                if (!excludeIds.contains(c.getId())) {
                    byId.putIfAbsent(c.getId(), c);
                }
            }
        }
        return byId.values().stream().limit(LIMIT).toList();
    }

    private List<Course> popularPublished(Set<Long> excludeIds) {
        return courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED).stream()
                .filter(c -> !excludeIds.contains(c.getId()))
                .limit(LIMIT)
                .toList();
    }
}
