package com.meridian.family;

import com.meridian.auth.AuthService;
import com.meridian.auth.dto.AuthResponse;
import com.meridian.common.ApiException;
import com.meridian.family.dto.ChildProfileDto;
import com.meridian.family.dto.ChildProgressDto;
import com.meridian.family.dto.ChildProgressDto.RecentLessonDto;
import com.meridian.family.dto.ChildProgressDto.WeeklyLessonPoint;
import com.meridian.family.dto.CreateChildRequest;
import com.meridian.gradebook.ReportService;
import com.meridian.gradebook.dto.ReportDtos.GradebookRow;
import com.meridian.progress.LessonProgress;
import com.meridian.progress.LessonProgressRepository;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Phụ huynh quản lý hồ sơ con và chuyển sang học cùng con — không cần mật khẩu của con. */
@Service
public class FamilyService {

    private static final String CHILD_ROLE = "student";
    private static final int WEEKS_BACK = 8;

    private final ParentChildProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final LessonProgressRepository lessonProgressRepository;
    private final ReportService reportService;

    public FamilyService(ParentChildProfileRepository profileRepository,
            UserRepository userRepository, AuthService authService,
            LessonProgressRepository lessonProgressRepository, ReportService reportService) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.lessonProgressRepository = lessonProgressRepository;
        this.reportService = reportService;
    }

    @Transactional
    public ChildProfileDto createChildProfile(UUID parentId, CreateChildRequest request) {
        User parent = userRepository.findById(parentId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phụ huynh"));

        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        User child = authService.createUserAccount(
                "child_" + suffix, "child+" + suffix + "@meridian.local",
                UUID.randomUUID().toString(), request.fullName());
        authService.assignRole(child, CHILD_ROLE);

        ParentChildProfile profile = new ParentChildProfile();
        profile.setParent(parent);
        profile.setChild(child);
        profileRepository.save(profile);

        return ChildProfileDto.from(child);
    }

    @Transactional(readOnly = true)
    public List<ChildProfileDto> listChildren(UUID parentId) {
        return profileRepository.findByParentId(parentId).stream()
                .map(p -> ChildProfileDto.from(p.getChild()))
                .toList();
    }

    @Transactional
    public void deleteChildProfile(UUID parentId, UUID childId) {
        profileRepository.deleteByParentIdAndChildId(parentId, childId);
    }

    @Transactional(readOnly = true)
    public AuthResponse switchToChild(UUID parentId, UUID childId) {
        if (!profileRepository.existsByParentIdAndChildId(parentId, childId)) {
            throw ApiException.forbidden("Hồ sơ con này không thuộc quyền quản lý của bạn");
        }
        User child = userRepository.findById(childId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy hồ sơ con"));
        return authService.issueTokensForUser(child);
    }

    /** Tiến độ học của một con — buổi học hoàn thành theo tuần + điểm luyện tập trung bình. */
    @Transactional(readOnly = true)
    public ChildProgressDto childProgress(UUID parentId, UUID childId) {
        if (!profileRepository.existsByParentIdAndChildId(parentId, childId)) {
            throw ApiException.forbidden("Hồ sơ con này không thuộc quyền quản lý của bạn");
        }

        Instant since = Instant.now().minus(WEEKS_BACK * 7L, ChronoUnit.DAYS);
        List<LessonProgress> recent = lessonProgressRepository
                .findByUserIdAndCompletedAtAfterOrderByCompletedAtDesc(childId, since);

        LocalDate thisWeekMonday = LocalDate.now(ZoneOffset.UTC).with(DayOfWeek.MONDAY);
        Map<LocalDate, Long> byWeek = new LinkedHashMap<>();
        for (int i = WEEKS_BACK - 1; i >= 0; i--) {
            byWeek.put(thisWeekMonday.minusWeeks(i), 0L);
        }
        for (LessonProgress lp : recent) {
            LocalDate weekMonday = LocalDate.ofInstant(lp.getCompletedAt(), ZoneOffset.UTC)
                    .with(DayOfWeek.MONDAY);
            byWeek.computeIfPresent(weekMonday, (k, v) -> v + 1);
        }
        List<WeeklyLessonPoint> weeklyLessons = byWeek.entrySet().stream()
                .map(e -> new WeeklyLessonPoint(e.getKey().toString(), e.getValue()))
                .toList();

        List<RecentLessonDto> recentLessons = recent.stream()
                .limit(10)
                .map(lp -> new RecentLessonDto(lp.getSection().getTitle(),
                        lp.getSection().getCourse().getTitle(), lp.getCompletedAt()))
                .toList();

        int totalLessonsCompleted = (int) lessonProgressRepository.countByUserId(childId);

        List<GradebookRow> gradebook = reportService.gradebookForUser(childId, null);
        List<GradebookRow> graded = gradebook.stream()
                .filter(r -> r.bestScore() != null && r.maxScore() != null
                        && r.maxScore().compareTo(BigDecimal.ZERO) > 0)
                .toList();
        Double averageScorePct = graded.isEmpty() ? null
                : graded.stream()
                        .mapToDouble(r -> r.bestScore().doubleValue() / r.maxScore().doubleValue() * 100)
                        .average()
                        .orElse(0);

        return new ChildProgressDto(totalLessonsCompleted, averageScorePct, weeklyLessons, recentLessons);
    }
}
