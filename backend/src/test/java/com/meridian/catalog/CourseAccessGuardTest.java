package com.meridian.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.catalog.dto.EnrollmentRequests;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.roster.RosterService;
import com.meridian.user.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Đợt 4: chỉ người đã được ghi danh (hoặc phụ trách khóa) mới xem được nội dung học; học viên không tự ghi danh. */
@ExtendWith(MockitoExtension.class)
class CourseAccessGuardTest {

    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private CourseSectionRepository sectionRepository;
    @Mock private PermissionService permissionService;
    @Mock private ContextService contextService;
    @Mock private UserRepository userRepository;
    @Mock private RosterService rosterService;

    private CourseAccessGuard guard;
    private Course course;
    private final UUID student = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        guard = new CourseAccessGuard(enrollmentRepository, courseRepository, sectionRepository,
                permissionService, contextService);
        Context ctx = new Context();
        ctx.setId(30L);
        course = new Course();
        course.setId(7L);
        course.setStatus(CourseStatus.PUBLISHED);
        course.setContext(ctx);
    }

    @Test
    void enrolledStudent_canAccess() {
        when(enrollmentRepository.existsByUserIdAndCourseId(student, 7L)).thenReturn(true);
        assertThat(guard.canAccessContent(student, course)).isTrue();
    }

    @Test
    void notEnrolledStudent_cannotAccess() {
        when(enrollmentRepository.existsByUserIdAndCourseId(student, 7L)).thenReturn(false);
        assertThat(guard.canAccessContent(student, course)).isFalse();
    }

    @Test
    void anonymous_cannotAccess_withoutTouchingTheDatabase() {
        assertThat(guard.canAccessContent(null, course)).isFalse();
        verify(enrollmentRepository, never()).existsByUserIdAndCourseId(any(), anyLong());
    }

    @Test
    void courseManager_canAccess_withoutEnrollment() {
        UUID teacher = UUID.randomUUID();
        when(enrollmentRepository.existsByUserIdAndCourseId(teacher, 7L)).thenReturn(false);
        when(permissionService.hasCapability(teacher, "course:manage", 30L)).thenReturn(true);
        assertThat(guard.canAccessContent(teacher, course)).isTrue();
    }

    @Test
    void reportViewer_likeBranchManager_canAccess_withoutEnrollment() {
        UUID manager = UUID.randomUUID();
        when(enrollmentRepository.existsByUserIdAndCourseId(manager, 7L)).thenReturn(false);
        lenient().when(permissionService.hasCapability(eq(manager), anyString(), eq(30L)))
                .thenAnswer(inv -> "report:viewlive".equals(inv.getArgument(1)));
        assertThat(guard.canAccessContent(manager, course)).isTrue();
    }

    @Test
    void requireSectionAccess_rejectsStudentOfAnotherCourse() {
        CourseSection section = new CourseSection();
        section.setId(55L);
        section.setCourse(course);
        when(sectionRepository.findById(55L)).thenReturn(Optional.of(section));
        when(enrollmentRepository.existsByUserIdAndCourseId(student, 7L)).thenReturn(false);

        assertThatThrownBy(() -> guard.requireSectionAccess(student, 55L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("ghi danh");
    }

    @Test
    void requireCourseAccess_unknownCourse_isNotFound() {
        when(courseRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> guard.requireCourseAccess(student, 99L)).isInstanceOf(ApiException.class);
    }

    @Test
    void selfEnrollment_isRefused_forEveryCourseIncludingKids() {
        EnrollmentService enrollmentService = new EnrollmentService(enrollmentRepository, courseRepository,
                userRepository, rosterService, permissionService, contextService);
        CourseCategory kids = new CourseCategory();
        kids.setAudienceGroup(CourseAudienceGroup.TRE_EM);
        course.setCategory(kids);
        when(courseRepository.findById(7L)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> enrollmentService.enroll(student, new EnrollmentRequests.Enroll(7L)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("ghi danh cho bạn");
        verify(enrollmentRepository, never()).save(any());
    }
}
