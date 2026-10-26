package com.meridian.classroom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseStatus;
import com.meridian.catalog.EnrollmentService;
import com.meridian.catalog.dto.BulkEnrollResult;
import com.meridian.classroom.dto.ClassDtos.AddMembersResult;
import com.meridian.classroom.dto.ClassDtos.ClassSummary;
import com.meridian.classroom.dto.ClassDtos.LinkCourseResult;
import com.meridian.common.ApiException;
import com.meridian.rbac.PermissionService;
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

/** Lớp học: thêm thành viên tự ghi danh khóa đã gắn, gắn lớp vào khóa ghi danh cả lớp, gỡ không hủy ghi danh. */
@ExtendWith(MockitoExtension.class)
class ClassServiceTest {

    @Mock private SchoolClassRepository classRepository;
    @Mock private SchoolClassMemberRepository memberRepository;
    @Mock private SchoolClassCourseRepository courseLinkRepository;
    @Mock private UserRepository userRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private EnrollmentService enrollmentService;
    @Mock private PermissionService permissionService;

    private final UUID admin = UUID.randomUUID();
    private ClassService service;
    private SchoolClass lop;

    @BeforeEach
    void setUp() {
        service = new ClassService(classRepository, memberRepository, courseLinkRepository,
                userRepository, courseRepository, enrollmentService, permissionService);
        lop = new SchoolClass();
        lop.setId(1L);
        lop.setName("IELTS 6.5 sáng thứ 2-4-6");
    }

    private User user(UUID id) {
        User u = new User();
        u.setId(id);
        u.setFullName("User " + id.toString().substring(0, 4));
        u.setUsername("u" + id.toString().substring(0, 4));
        return u;
    }

    private Course course(Long id, CourseStatus status) {
        Course c = new Course();
        c.setId(id);
        c.setTitle("Khóa " + id);
        c.setStatus(status);
        return c;
    }

    @Test
    void create_duplicateName_isConflict() {
        when(classRepository.existsByNameIgnoreCase("Lớp A")).thenReturn(true);

        assertThatThrownBy(() -> service.create(admin, "  Lớp A  ", null))
                .isInstanceOf(ApiException.class);
        verify(classRepository, never()).save(any());
    }

    @Test
    void create_storesTrimmedNameAndCreator() {
        when(classRepository.existsByNameIgnoreCase("Lớp B")).thenReturn(false);
        when(classRepository.save(any(SchoolClass.class))).thenAnswer(inv -> {
            SchoolClass c = inv.getArgument(0);
            c.setId(7L);
            return c;
        });

        ClassSummary result = service.create(admin, "  Lớp B ", "  ");

        assertThat(result.id()).isEqualTo(7L);
        assertThat(result.name()).isEqualTo("Lớp B");
        assertThat(result.description()).isNull();
        assertThat(result.memberCount()).isZero();
    }

    @Test
    void anyOperation_withoutCapability_isRejectedBeforeTouchingData() {
        doThrow(ApiException.forbidden("Thiếu quyền")).when(permissionService)
                .requireSystemCapability(eq(admin), eq("enrollment:manage"));

        assertThatThrownBy(() -> service.create(admin, "Lớp C", null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.addMembers(admin, 1L, List.of(UUID.randomUUID())))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.linkCourse(admin, 1L, 10L)).isInstanceOf(ApiException.class);
        verifyNoInteractions(classRepository, memberRepository, courseLinkRepository, enrollmentService);
    }

    @Test
    void addMembers_enrollsOnlyNewMembers_intoPublishedLinkedCourses() {
        UUID existingMember = UUID.randomUUID();
        UUID newA = UUID.randomUUID();
        UUID newB = UUID.randomUUID();
        UUID ghost = UUID.randomUUID(); // không tồn tại trong DB
        when(classRepository.findById(1L)).thenReturn(Optional.of(lop));
        when(userRepository.findAllById(any())).thenReturn(
                List.of(user(existingMember), user(newA), user(newB)));
        when(memberRepository.findUserIdsByClassId(1L)).thenReturn(List.of(existingMember));
        // Lớp đang gắn 3 khóa: 1 đã xuất bản, 1 nháp, 1 đã bị xóa.
        when(courseLinkRepository.findByClassId(1L)).thenReturn(List.of(
                new SchoolClassCourse(1L, 10L), new SchoolClassCourse(1L, 11L), new SchoolClassCourse(1L, 12L)));
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course(10L, CourseStatus.PUBLISHED)));
        when(courseRepository.findById(11L)).thenReturn(Optional.of(course(11L, CourseStatus.DRAFT)));
        when(courseRepository.findById(12L)).thenReturn(Optional.empty());
        when(enrollmentService.enrollUsersInCourse(any(), eq(10L))).thenReturn(new BulkEnrollResult(2, 0, 0));

        AddMembersResult result = service.addMembers(admin, 1L, List.of(existingMember, newA, newB, ghost));

        assertThat(result.added()).isEqualTo(2);
        assertThat(result.alreadyInClass()).isEqualTo(1);
        assertThat(result.notFound()).isEqualTo(1);
        assertThat(result.newlyEnrolled()).isEqualTo(2);
        verify(memberRepository, times(2)).save(any(SchoolClassMember.class));
        verify(enrollmentService, times(1)).enrollUsersInCourse(any(), anyLong());
        verify(enrollmentService, never()).enrollUsersInCourse(any(), eq(11L));
    }

    @Test
    void addMembers_everyoneAlreadyInClass_doesNotEnrollAnything() {
        UUID member = UUID.randomUUID();
        when(classRepository.findById(1L)).thenReturn(Optional.of(lop));
        when(userRepository.findAllById(any())).thenReturn(List.of(user(member)));
        when(memberRepository.findUserIdsByClassId(1L)).thenReturn(List.of(member));

        AddMembersResult result = service.addMembers(admin, 1L, List.of(member));

        assertThat(result.added()).isZero();
        assertThat(result.alreadyInClass()).isEqualTo(1);
        verify(memberRepository, never()).save(any());
        verifyNoInteractions(enrollmentService);
    }

    @Test
    void linkCourse_enrollsEveryCurrentMember_andStoresTheLink() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(classRepository.findById(1L)).thenReturn(Optional.of(lop));
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course(10L, CourseStatus.PUBLISHED)));
        when(courseLinkRepository.findByClassIdAndCourseId(1L, 10L)).thenReturn(Optional.empty());
        when(memberRepository.findUserIdsByClassId(1L)).thenReturn(List.of(a, b));
        when(enrollmentService.enrollUsersInCourse(List.of(a, b), 10L)).thenReturn(new BulkEnrollResult(1, 1, 0));

        LinkCourseResult result = service.linkCourse(admin, 1L, 10L);

        assertThat(result.memberCount()).isEqualTo(2);
        assertThat(result.newlyEnrolled()).isEqualTo(1);
        assertThat(result.alreadyEnrolled()).isEqualTo(1);
        verify(courseLinkRepository).save(any(SchoolClassCourse.class));
    }

    @Test
    void linkCourse_alreadyLinked_doesNotDuplicateTheLink_butStillSyncsEnrollments() {
        UUID a = UUID.randomUUID();
        when(classRepository.findById(1L)).thenReturn(Optional.of(lop));
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course(10L, CourseStatus.PUBLISHED)));
        when(courseLinkRepository.findByClassIdAndCourseId(1L, 10L))
                .thenReturn(Optional.of(new SchoolClassCourse(1L, 10L)));
        when(memberRepository.findUserIdsByClassId(1L)).thenReturn(List.of(a));
        when(enrollmentService.enrollUsersInCourse(List.of(a), 10L)).thenReturn(new BulkEnrollResult(1, 0, 0));

        service.linkCourse(admin, 1L, 10L);

        verify(courseLinkRepository, never()).save(any());
        verify(enrollmentService).enrollUsersInCourse(List.of(a), 10L);
    }

    @Test
    void linkCourse_draftCourse_isRejected() {
        when(classRepository.findById(1L)).thenReturn(Optional.of(lop));
        when(courseRepository.findById(11L)).thenReturn(Optional.of(course(11L, CourseStatus.DRAFT)));

        assertThatThrownBy(() -> service.linkCourse(admin, 1L, 11L)).isInstanceOf(ApiException.class);
        verify(courseLinkRepository, never()).save(any());
        verifyNoInteractions(enrollmentService);
    }

    @Test
    void removeMember_andUnlinkCourse_neverCancelEnrollments() {
        UUID a = UUID.randomUUID();
        SchoolClassMember member = new SchoolClassMember(1L, a);
        SchoolClassCourse link = new SchoolClassCourse(1L, 10L);
        when(classRepository.findById(1L)).thenReturn(Optional.of(lop));
        when(memberRepository.findByClassIdAndUserId(1L, a)).thenReturn(Optional.of(member));
        when(courseLinkRepository.findByClassIdAndCourseId(1L, 10L)).thenReturn(Optional.of(link));

        service.removeMember(admin, 1L, a);
        service.unlinkCourse(admin, 1L, 10L);

        verify(memberRepository).delete(member);
        verify(courseLinkRepository).delete(link);
        verifyNoInteractions(enrollmentService);
    }

    @Test
    void list_filtersByCourse_andReportsCounts() {
        SchoolClass other = new SchoolClass();
        other.setId(2L);
        other.setName("Lớp khác");
        when(classRepository.findAllByOrderByNameAsc()).thenReturn(List.of(lop, other));
        when(memberRepository.countGroupedByClass()).thenReturn(List.<Object[]>of(new Object[] {1L, 3L}));
        when(courseLinkRepository.countGroupedByClass()).thenReturn(List.<Object[]>of(new Object[] {1L, 2L}));
        when(courseLinkRepository.findByCourseId(10L)).thenReturn(List.of(new SchoolClassCourse(1L, 10L)));

        List<ClassSummary> filtered = service.list(admin, 10L);

        assertThat(filtered).hasSize(1);
        assertThat(filtered.get(0).memberCount()).isEqualTo(3);
        assertThat(filtered.get(0).courseCount()).isEqualTo(2);
    }
}
