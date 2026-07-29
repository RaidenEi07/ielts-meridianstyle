package com.meridian.recording;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
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

@ExtendWith(MockitoExtension.class)
class LessonRecordingServiceTest {

    @Mock private LessonRecordingRepository recordingRepository;
    @Mock private CourseSectionRepository sectionRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private PermissionService permissionService;
    @Mock private ContextService contextService;

    private LessonRecordingService service;

    @BeforeEach
    void setUp() {
        service = new LessonRecordingService(recordingRepository, sectionRepository,
                enrollmentRepository, userRepository, permissionService, contextService);
    }

    private CourseSection sectionWithCourse(Long sectionId, Long courseId) {
        Course course = new Course();
        course.setId(courseId);
        CourseSection section = new CourseSection();
        section.setId(sectionId);
        section.setCourse(course);
        return section;
    }

    private LessonRecording recording(Long id, UUID userId, CourseSection section) {
        LessonRecording r = new LessonRecording();
        r.setId(id);
        r.setUserId(userId);
        r.setSection(section);
        r.setAudioUrl("/uploads/audio/x.wav");
        return r;
    }

    @Test
    void rateRecordingRejectsOutOfRangeStars() {
        assertThatThrownBy(() -> service.rateRecording(UUID.randomUUID(), 1L, 0))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.rateRecording(UUID.randomUUID(), 1L, 6))
                .isInstanceOf(ApiException.class);
    }

    private Context systemContext() {
        Context ctx = new Context();
        ctx.setId(1L);
        return ctx;
    }

    @Test
    void rateRecordingSavesStarRatingWhenPermitted() {
        UUID teacherId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        CourseSection section = sectionWithCourse(10L, 1L);
        LessonRecording rec = recording(5L, studentId, section);
        when(recordingRepository.findById(5L)).thenReturn(Optional.of(rec));
        when(contextService.requireSystemContext()).thenReturn(systemContext());

        service.rateRecording(teacherId, 5L, 4);

        verify(permissionService).requireCapability(eq(teacherId), eq("course:manage"), any());
        assertThat(rec.getStarRating()).isEqualTo(4);
        verify(recordingRepository).save(rec);
    }

    @Test
    void listRecordingsForTeacherIncludesStudentNameAndRating() {
        UUID teacherId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        CourseSection section = sectionWithCourse(10L, 1L);
        when(sectionRepository.findById(10L)).thenReturn(Optional.of(section));
        when(contextService.requireSystemContext()).thenReturn(systemContext());

        LessonRecording rec = recording(5L, studentId, section);
        rec.setStarRating(3);
        when(recordingRepository.findBySection_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of(rec));

        User student = new User();
        student.setId(studentId);
        student.setFullName("Nguyễn Văn A");
        when(userRepository.findAllById(any())).thenReturn(List.of(student));

        var result = service.listRecordingsForTeacher(teacherId, 10L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(result.get(0).starRating()).isEqualTo(3);
        verify(permissionService).requireCapability(eq(teacherId), eq("course:manage"), any());
    }
}
