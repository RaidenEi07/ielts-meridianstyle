package com.meridian.recommendation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseAudienceGroup;
import com.meridian.catalog.CourseCategory;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseStatus;
import com.meridian.catalog.Enrollment;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.gradebook.ReportService;
import com.meridian.gradebook.dto.ReportDtos.GradebookRow;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock private ReportService reportService;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private CourseRepository courseRepository;

    private RecommendationService service;

    @BeforeEach
    void setUp() {
        service = new RecommendationService(reportService, enrollmentRepository, courseRepository);
    }

    private Course course(Long id, String title, CourseAudienceGroup group, CourseStatus status) {
        CourseCategory cat = new CourseCategory();
        cat.setId(100L);
        cat.setName("Danh mục");
        cat.setAudienceGroup(group);
        Course c = new Course();
        c.setId(id);
        c.setTitle(title);
        c.setShortname("course-" + id);
        c.setStatus(status);
        c.setPrice(BigDecimal.ZERO);
        c.setCategory(cat);
        return c;
    }

    private Enrollment enrollmentIn(Course c) {
        Enrollment e = new Enrollment();
        e.setCourse(c);
        return e;
    }

    @Test
    void coldStartFallsBackToPopularCoursesWhenNoSignalAtAll() {
        UUID userId = UUID.randomUUID();
        when(enrollmentRepository.findByUserIdOrderByEnrolledAtDesc(userId)).thenReturn(List.of());
        when(reportService.gradebookForUser(userId, null)).thenReturn(List.of());

        Course popular = course(1L, "Khóa phổ biến", CourseAudienceGroup.IELTS, CourseStatus.PUBLISHED);
        when(courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED))
                .thenReturn(List.of(popular));
        when(enrollmentRepository.countByCourseId(1L)).thenReturn(3L);

        var result = service.recommendedCoursesFor(userId);

        assertThat(result.courses()).hasSize(1);
        assertThat(result.courses().get(0).id()).isEqualTo(1L);
        assertThat(result.averageBandScore()).isNull();
        assertThat(result.note()).contains("chưa có lượt học");
    }

    @Test
    void recommendsCoursesInSameAudienceGroupExcludingAlreadyEnrolled() {
        UUID userId = UUID.randomUUID();
        Course enrolledCourse = course(1L, "Đã ghi danh", CourseAudienceGroup.IELTS, CourseStatus.PUBLISHED);
        when(enrollmentRepository.findByUserIdOrderByEnrolledAtDesc(userId))
                .thenReturn(List.of(enrollmentIn(enrolledCourse)));
        when(reportService.gradebookForUser(userId, null)).thenReturn(List.of());

        Course notEnrolled = course(2L, "Khóa mới", CourseAudienceGroup.IELTS, CourseStatus.PUBLISHED);
        when(courseRepository.findByCategory_AudienceGroupAndStatusOrderByCreatedAtDesc(
                CourseAudienceGroup.IELTS, CourseStatus.PUBLISHED))
                .thenReturn(List.of(enrolledCourse, notEnrolled));
        when(enrollmentRepository.countByCourseId(2L)).thenReturn(0L);

        var result = service.recommendedCoursesFor(userId);

        assertThat(result.courses()).hasSize(1);
        assertThat(result.courses().get(0).id()).isEqualTo(2L);
        assertThat(result.note()).contains("nhóm khóa học bạn đang học");
    }

    @Test
    void computesAverageBandScoreAcrossAttemptedQuizzes() {
        UUID userId = UUID.randomUUID();
        Course attemptedCourse = course(5L, "Khóa đã làm bài", CourseAudienceGroup.IELTS, CourseStatus.PUBLISHED);
        when(enrollmentRepository.findByUserIdOrderByEnrolledAtDesc(userId)).thenReturn(List.of());

        var row1 = new GradebookRow(1L, "Quiz 1", 5L, "Khóa đã làm bài",
                BigDecimal.TEN, BigDecimal.TEN, new BigDecimal("6.0"), "GRADED", 1, null, List.of());
        var row2 = new GradebookRow(2L, "Quiz 2", 5L, "Khóa đã làm bài",
                BigDecimal.TEN, BigDecimal.TEN, new BigDecimal("7.0"), "GRADED", 1, null, List.of());
        when(reportService.gradebookForUser(userId, null)).thenReturn(List.of(row1, row2));
        when(courseRepository.findById(5L)).thenReturn(java.util.Optional.of(attemptedCourse));
        when(courseRepository.findByCategory_AudienceGroupAndStatusOrderByCreatedAtDesc(
                CourseAudienceGroup.IELTS, CourseStatus.PUBLISHED))
                .thenReturn(List.of());
        when(courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED))
                .thenReturn(List.of());

        var result = service.recommendedCoursesFor(userId);

        assertThat(result.averageBandScore()).isEqualByComparingTo("6.5");
    }
}
