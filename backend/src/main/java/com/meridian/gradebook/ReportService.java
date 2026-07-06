package com.meridian.gradebook;

import com.meridian.catalog.Enrollment;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.catalog.CourseRepository;
import com.meridian.common.ApiException;
import com.meridian.gradebook.dto.ReportDtos.GradebookRow;
import com.meridian.gradebook.dto.ReportDtos.MonthlyPoint;
import com.meridian.gradebook.dto.ReportDtos.QuizReport;
import com.meridian.gradebook.dto.ReportDtos.QuizReportRow;
import com.meridian.gradebook.dto.ReportDtos.QuizReportStats;
import com.meridian.gradebook.dto.ReportDtos.SystemAnalytics;
import com.meridian.quiz.Quiz;
import com.meridian.quiz.QuizAttempt;
import com.meridian.quiz.QuizAttemptRepository;
import com.meridian.quiz.QuizRepository;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

    private final QuizAttemptRepository attemptRepository;
    private final QuizRepository quizRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final ContextService contextService;

    public ReportService(QuizAttemptRepository attemptRepository, QuizRepository quizRepository,
            EnrollmentRepository enrollmentRepository, CourseRepository courseRepository,
            UserRepository userRepository, PermissionService permissionService,
            ContextService contextService) {
        this.attemptRepository = attemptRepository;
        this.quizRepository = quizRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.contextService = contextService;
    }

    // ---- Student gradebook (điểm của tôi) ----

    @Transactional(readOnly = true)
    public List<GradebookRow> myGradebook(UUID uid, Long courseId) {
        permissionService.requireSystemCapability(uid, "grade:view");
        return gradebookForUser(uid, courseId);
    }

    /**
     * Admin xem sổ điểm của bất kỳ học sinh nào (theo dõi toàn bộ kết quả).
     * Không dùng {@link #myGradebook} vì capability ở đó kiểm tra trên chính
     * {@code uid} — ở đây cần kiểm tra quyền của ADMIN, còn dữ liệu lấy theo
     * {@code targetUserId}.
     */
    @Transactional(readOnly = true)
    public List<GradebookRow> adminStudentGradebook(UUID adminUid, UUID targetUserId, Long courseId) {
        permissionService.requireSystemCapability(adminUid, "user:manage");
        return gradebookForUser(targetUserId, courseId);
    }

    /**
     * Lấy sổ điểm (điểm cao nhất mỗi quiz đã làm) của một user bất kỳ — dùng
     * chung cho học sinh xem điểm mình, admin xem điểm bất kỳ ai, và giáo viên
     * xem điểm học sinh mình quản lý. Caller chịu trách nhiệm kiểm tra quyền
     * trước khi gọi — method này không tự kiểm tra.
     */
    @Transactional(readOnly = true)
    public List<GradebookRow> gradebookForUser(UUID targetUserId, Long courseId) {
        Map<Long, List<QuizAttempt>> byQuiz = attemptRepository
                .findByUserIdOrderByStartedAtDesc(targetUserId).stream()
                .collect(Collectors.groupingBy(a -> a.getQuiz().getId()));

        List<GradebookRow> rows = new ArrayList<>();
        for (var entry : byQuiz.entrySet()) {
            if (!quizRepository.existsById(entry.getKey())) {
                // Quiz đã bị xóa nhưng còn attempt cũ tham chiếu tới — bỏ qua bản ghi
                // rác này thay vì để nó làm hỏng toàn bộ sổ điểm của user.
                continue;
            }
            List<QuizAttempt> attempts = entry.getValue();
            Quiz quiz = attempts.get(0).getQuiz();
            var course = quiz.getSection().getCourse();
            if (courseId != null && !course.getId().equals(courseId)) {
                continue;
            }
            QuizAttempt best = attempts.stream()
                    .max(Comparator.comparing(a -> a.getRawScore() != null
                            ? a.getRawScore() : BigDecimal.valueOf(-1)))
                    .orElse(attempts.get(0));
            rows.add(new GradebookRow(quiz.getId(), quiz.getTitle(), course.getId(),
                    course.getTitle(), best.getRawScore(), best.getMaxScore(),
                    best.getBandScore(), best.getStatus().name(), attempts.size(),
                    best.getSubmittedAt()));
        }
        rows.sort(Comparator.comparing(GradebookRow::courseName));
        return rows;
    }

    // ---- Teacher quiz report ----

    @Transactional(readOnly = true)
    public QuizReport quizReport(UUID uid, Long quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy quiz"));
        permissionService.requireCapability(uid, "report:viewlive", ctxId(quiz.getContext()));

        List<QuizAttempt> attempts = attemptRepository.findByQuizIdOrderByStartedAtDesc(quizId);
        List<QuizAttempt> graded = attempts.stream()
                .filter(a -> a.getRawScore() != null).toList();

        BigDecimal avg = graded.isEmpty() ? BigDecimal.ZERO : scale(
                graded.stream().map(QuizAttempt::getRawScore)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(graded.size()), 4, RoundingMode.HALF_UP));
        BigDecimal max = graded.stream().map(QuizAttempt::getRawScore)
                .max(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal min = graded.stream().map(QuizAttempt::getRawScore)
                .min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal avgViol = attempts.isEmpty() ? BigDecimal.ZERO : scale(
                BigDecimal.valueOf(attempts.stream().mapToInt(QuizAttempt::getViolations).sum())
                        .divide(BigDecimal.valueOf(attempts.size()), 4, RoundingMode.HALF_UP));

        // Nhóm theo học viên -> best attempt
        Map<UUID, List<QuizAttempt>> byUser = attempts.stream()
                .collect(Collectors.groupingBy(QuizAttempt::getUserId, LinkedHashMap::new, Collectors.toList()));

        long passCount = 0;
        List<QuizReportRow> rows = new ArrayList<>();
        for (var e : byUser.entrySet()) {
            QuizAttempt best = e.getValue().stream()
                    .max(Comparator.comparing(a -> a.getRawScore() != null
                            ? a.getRawScore() : BigDecimal.valueOf(-1)))
                    .orElse(e.getValue().get(0));
            String name = userRepository.findById(e.getKey())
                    .map(u -> u.getFullName()).orElse("(đã xóa)");
            if (quiz.getPassMark() != null && best.getRawScore() != null
                    && best.getRawScore().compareTo(quiz.getPassMark()) >= 0) {
                passCount++;
            }
            rows.add(new QuizReportRow(e.getKey(), name, e.getValue().size(),
                    best.getRawScore(), best.getBandScore(), best.getStatus().name(),
                    best.getViolations()));
        }
        BigDecimal passRate = byUser.isEmpty() ? BigDecimal.ZERO : scale(
                BigDecimal.valueOf(passCount)
                        .divide(BigDecimal.valueOf(byUser.size()), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)));

        QuizReportStats stats = new QuizReportStats(attempts.size(), byUser.size(),
                graded.size(), avg, max, min, passRate, avgViol);
        return new QuizReport(quizId, quiz.getTitle(),
                attempts.isEmpty() ? null : attempts.get(0).getMaxScore(), stats, rows);
    }

    // ---- Admin system analytics ----

    @Transactional(readOnly = true)
    public SystemAnalytics systemAnalytics(UUID uid) {
        permissionService.requireSystemCapability(uid, "report:viewlive");

        List<Enrollment> enrollments = enrollmentRepository.findAll();
        BigDecimal revenue = BigDecimal.ZERO;

        // 6 tháng gần nhất
        Map<String, long[]> monthCount = new LinkedHashMap<>();
        Map<String, BigDecimal> monthRevenue = new LinkedHashMap<>();
        YearMonth now = YearMonth.now(ZoneOffset.UTC);
        List<String> months = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            String key = now.minusMonths(i).toString();
            months.add(key);
            monthCount.put(key, new long[] {0});
            monthRevenue.put(key, BigDecimal.ZERO);
        }
        for (Enrollment e : enrollments) {
            BigDecimal price = e.getCourse().getPrice();
            revenue = revenue.add(price);
            String key = YearMonth.from(e.getEnrolledAt().atOffset(ZoneOffset.UTC)).toString();
            if (monthCount.containsKey(key)) {
                monthCount.get(key)[0]++;
                monthRevenue.put(key, monthRevenue.get(key).add(price));
            }
        }
        List<MonthlyPoint> monthly = months.stream()
                .map(m -> new MonthlyPoint(m, monthCount.get(m)[0], monthRevenue.get(m)))
                .toList();

        return new SystemAnalytics(userRepository.count(), courseRepository.count(),
                enrollmentRepository.count(), quizRepository.count(),
                attemptRepository.count(), revenue, monthly);
    }

    private BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private Long ctxId(Context ctx) {
        return ctx == null ? contextService.requireSystemContext().getId() : ctx.getId();
    }
}
