package com.meridian.progress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.common.ApiException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LessonProgressServiceTest {

    @Mock private LessonProgressRepository progressRepository;
    @Mock private CourseSectionRepository sectionRepository;
    @Mock private EnrollmentRepository enrollmentRepository;

    private LessonProgressService service;

    @BeforeEach
    void setUp() {
        service = new LessonProgressService(progressRepository, sectionRepository, enrollmentRepository);
    }

    private CourseSection sectionWithCourse(Long sectionId, Long courseId) {
        Course course = new Course();
        course.setId(courseId);
        CourseSection section = new CourseSection();
        section.setId(sectionId);
        section.setCourse(course);
        return section;
    }

    @Test
    void markCompleteInsertsRowWhenNotAlreadyCompleted() {
        UUID userId = UUID.randomUUID();
        when(progressRepository.existsByUserIdAndSectionId(userId, 10L)).thenReturn(false);
        when(sectionRepository.findById(10L)).thenReturn(Optional.of(sectionWithCourse(10L, 1L)));

        service.markComplete(userId, 10L);

        verify(progressRepository).save(any(LessonProgress.class));
    }

    @Test
    void markCompleteIsIdempotent() {
        UUID userId = UUID.randomUUID();
        when(progressRepository.existsByUserIdAndSectionId(userId, 10L)).thenReturn(true);

        service.markComplete(userId, 10L);

        verify(progressRepository, never()).save(any());
        verify(sectionRepository, never()).findById(any());
    }

    @Test
    void markCompleteAsStudentRejectsWithoutEnrollment() {
        UUID userId = UUID.randomUUID();
        when(sectionRepository.findById(10L)).thenReturn(Optional.of(sectionWithCourse(10L, 1L)));
        when(enrollmentRepository.existsByUserIdAndCourseId(userId, 1L)).thenReturn(false);

        assertThatThrownBy(() -> service.markCompleteAsStudent(userId, 10L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(403));

        verify(progressRepository, never()).save(any());
    }

    @Test
    void markCompleteAsStudentSucceedsWhenEnrolled() {
        UUID userId = UUID.randomUUID();
        when(sectionRepository.findById(10L)).thenReturn(Optional.of(sectionWithCourse(10L, 1L)));
        when(enrollmentRepository.existsByUserIdAndCourseId(userId, 1L)).thenReturn(true);
        when(progressRepository.existsByUserIdAndSectionId(userId, 10L)).thenReturn(false);

        service.markCompleteAsStudent(userId, 10L);

        verify(progressRepository).save(any(LessonProgress.class));
    }

    @Test
    void completedSectionIdsMapsToSectionIds() {
        UUID userId = UUID.randomUUID();
        LessonProgress p1 = new LessonProgress();
        p1.setSection(sectionWithCourse(10L, 1L));
        LessonProgress p2 = new LessonProgress();
        p2.setSection(sectionWithCourse(11L, 1L));
        when(progressRepository.findByUserIdAndSection_Course_Id(userId, 1L))
                .thenReturn(List.of(p1, p2));

        var result = service.completedSectionIds(userId, 1L);

        assertThat(result).containsExactlyInAnyOrder(10L, 11L);
    }
}
