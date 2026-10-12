package com.meridian.catalog;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.quiz.QuizRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

/** Khóa chưa xuất bản không được lộ cho người lạ qua endpoint công khai /api/catalog/courses/{id}. */
class CatalogServiceVisibilityTest {

    private PermissionService permissionService;
    private EnrollmentRepository enrollmentRepository;
    private CatalogService service;

    private final UUID staff = UUID.randomUUID();
    private final UUID student = UUID.randomUUID();
    private final UUID stranger = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        permissionService = mock(PermissionService.class);
        enrollmentRepository = mock(EnrollmentRepository.class);
        service = new CatalogService(
                mock(CourseCategoryRepository.class),
                mock(CourseRepository.class),
                mock(CourseSectionRepository.class),
                mock(ExamTemplateRepository.class),
                enrollmentRepository,
                mock(QuizRepository.class),
                mock(ContextService.class),
                permissionService,
                mock(ObjectMapper.class));
    }

    private Course course(CourseStatus status) {
        Context ctx = new Context();
        ctx.setId(77L);
        Course c = new Course();
        c.setId(5L);
        c.setStatus(status);
        c.setContext(ctx);
        return c;
    }

    @Test
    void publishedCourseIsVisibleToAnonymousVisitors() {
        assertThatCode(() -> service.assertVisibleTo(course(CourseStatus.PUBLISHED), null)).doesNotThrowAnyException();
        verifyNoInteractions(permissionService, enrollmentRepository);
    }

    @Test
    void draftCourseIsNotFoundForAnonymousVisitors() {
        assertThatThrownBy(() -> service.assertVisibleTo(course(CourseStatus.DRAFT), null))
                .isInstanceOf(ApiException.class).hasMessage("Không tìm thấy khóa học");
    }

    @Test
    void archivedCourseIsNotFoundForAnonymousVisitors() {
        assertThatThrownBy(() -> service.assertVisibleTo(course(CourseStatus.ARCHIVED), null))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void draftCourseIsNotFoundForALoggedInStrangerWithoutRights() {
        when(permissionService.hasCapability(eq(stranger), eq("course:manage"), anyLong())).thenReturn(false);
        when(enrollmentRepository.existsByUserIdAndCourseId(eq(stranger), anyLong())).thenReturn(false);
        assertThatThrownBy(() -> service.assertVisibleTo(course(CourseStatus.DRAFT), stranger))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void courseManagerCanOpenADraftCourse() {
        when(permissionService.hasCapability(eq(staff), eq("course:manage"), eq(77L))).thenReturn(true);
        assertThatCode(() -> service.assertVisibleTo(course(CourseStatus.DRAFT), staff)).doesNotThrowAnyException();
    }

    @Test
    void enrolledStudentCanStillOpenAnArchivedCourse() {
        when(permissionService.hasCapability(any(), any(), anyLong())).thenReturn(false);
        when(enrollmentRepository.existsByUserIdAndCourseId(eq(student), eq(5L))).thenReturn(true);
        assertThatCode(() -> service.assertVisibleTo(course(CourseStatus.ARCHIVED), student)).doesNotThrowAnyException();
    }
}
