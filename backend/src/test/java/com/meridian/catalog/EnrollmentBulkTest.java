package com.meridian.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.meridian.catalog.dto.BulkEnrollResult;
import com.meridian.common.ApiException;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.roster.RosterService;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Ghi danh nhiều tài khoản vào 1 khóa: bỏ qua người đã ghi danh, đếm tài khoản không tồn tại, chỉ khóa đã xuất bản. */
@ExtendWith(MockitoExtension.class)
class EnrollmentBulkTest {

    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private UserRepository userRepository;
    @Mock private RosterService rosterService;
    @Mock private PermissionService permissionService;
    @Mock private ContextService contextService;

    private EnrollmentService service;

    @BeforeEach
    void setUp() {
        service = new EnrollmentService(enrollmentRepository, courseRepository, userRepository,
                rosterService, permissionService, contextService);
    }

    private Course course(CourseStatus status) {
        Course c = new Course();
        c.setId(10L);
        c.setTitle("IELTS Foundation");
        c.setStatus(status);
        return c;
    }

    private User user(UUID id) {
        User u = new User();
        u.setId(id);
        return u;
    }

    @Test
    void skipsAlreadyEnrolled_countsMissingAccounts() {
        UUID already = UUID.randomUUID();
        UUID fresh = UUID.randomUUID();
        UUID missing = UUID.randomUUID();
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course(CourseStatus.PUBLISHED)));
        when(userRepository.findAllById(any())).thenReturn(List.of(user(already), user(fresh)));
        when(enrollmentRepository.existsByUserIdAndCourseId(already, 10L)).thenReturn(true);
        when(enrollmentRepository.existsByUserIdAndCourseId(fresh, 10L)).thenReturn(false);

        BulkEnrollResult result = service.enrollUsersInCourse(List.of(already, fresh, missing, fresh), 10L);

        assertThat(result.enrolled()).isEqualTo(1);
        assertThat(result.alreadyEnrolled()).isEqualTo(1);
        assertThat(result.notFound()).isEqualTo(1);
        verify(enrollmentRepository, times(1)).save(any(Enrollment.class));
    }

    @Test
    void draftCourse_isRejected() {
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course(CourseStatus.DRAFT)));

        assertThatThrownBy(() -> service.enrollUsersInCourse(List.of(UUID.randomUUID()), 10L))
                .isInstanceOf(ApiException.class);
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void enrollUsersByAdmin_requiresEnrollmentManage_beforeDoingAnything() {
        UUID caller = UUID.randomUUID();
        doThrow(ApiException.forbidden("Thiếu quyền")).when(permissionService)
                .requireSystemCapability(eq(caller), eq("enrollment:manage"));

        assertThatThrownBy(() -> service.enrollUsersByAdmin(caller, List.of(UUID.randomUUID()), 10L))
                .isInstanceOf(ApiException.class);
        verifyNoInteractions(courseRepository, userRepository, enrollmentRepository);
    }
}
