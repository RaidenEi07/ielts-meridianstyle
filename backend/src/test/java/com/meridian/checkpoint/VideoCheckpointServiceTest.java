package com.meridian.checkpoint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.checkpoint.dto.VideoCheckpointRequests;
import com.meridian.question.Question;
import com.meridian.question.QuestionRepository;
import com.meridian.quiz.GradingService;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class VideoCheckpointServiceTest {

    @Mock private SectionVideoCheckpointRepository checkpointRepository;
    @Mock private VideoCheckpointAnswerRepository answerRepository;
    @Mock private CourseSectionRepository sectionRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private GradingService gradingService;
    @Mock private ContextService contextService;
    @Mock private PermissionService permissionService;

    private VideoCheckpointService service;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new VideoCheckpointService(checkpointRepository, answerRepository, sectionRepository,
                questionRepository, gradingService, contextService, permissionService);
    }

    private CourseSection sectionWithCourse(Long sectionId, Long courseId) {
        Course course = new Course();
        course.setId(courseId);
        CourseSection section = new CourseSection();
        section.setId(sectionId);
        section.setCourse(course);
        return section;
    }

    private SectionVideoCheckpoint checkpoint(Long id, CourseSection section, Long questionId) {
        SectionVideoCheckpoint c = new SectionVideoCheckpoint();
        c.setId(id);
        c.setSection(section);
        c.setTimestampSec(new BigDecimal("12.50"));
        c.setQuestionId(questionId);
        c.setSortOrder(0);
        return c;
    }

    @Test
    void listForStudentMarksAnsweredCheckpoints() {
        UUID userId = UUID.randomUUID();
        CourseSection section = sectionWithCourse(20L, 2L);
        SectionVideoCheckpoint cp1 = checkpoint(1L, section, 100L);
        SectionVideoCheckpoint cp2 = checkpoint(2L, section, 101L);
        when(checkpointRepository.findBySectionIdOrderBySortOrderAscIdAsc(20L))
                .thenReturn(List.of(cp1, cp2));

        VideoCheckpointAnswer answered = new VideoCheckpointAnswer();
        answered.setUserId(userId);
        answered.setCheckpointId(1L);
        when(answerRepository.findByUserIdAndCheckpointIdIn(eq(userId), any()))
                .thenReturn(List.of(answered));

        var result = service.listForStudent(userId, 20L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).answered()).isTrue();
        assertThat(result.get(1).id()).isEqualTo(2L);
        assertThat(result.get(1).answered()).isFalse();
    }

    @Test
    void listForStudentReturnsEmptyWhenNoCheckpoints() {
        when(checkpointRepository.findBySectionIdOrderBySortOrderAscIdAsc(20L)).thenReturn(List.of());

        var result = service.listForStudent(UUID.randomUUID(), 20L);

        assertThat(result).isEmpty();
    }

    @Test
    void replaceForSectionOverwritesExistingCheckpoints() {
        UUID userId = UUID.randomUUID();
        CourseSection section = sectionWithCourse(20L, 2L);
        when(sectionRepository.findById(20L)).thenReturn(Optional.of(section));
        when(contextService.requireSystemContext()).thenReturn(systemContext());
        Question q = new Question();
        q.setId(100L);
        when(questionRepository.findById(100L)).thenReturn(Optional.of(q));
        when(checkpointRepository.save(any(SectionVideoCheckpoint.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var items = List.of(
                new VideoCheckpointRequests.ReplaceCheckpoints.CheckpointItem(
                        new BigDecimal("5.00"), 100L, 0));

        var result = service.replaceForSection(userId, 20L, items);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).questionId()).isEqualTo(100L);
        assertThat(result.get(0).answered()).isFalse();
    }

    private Context systemContext() {
        Context ctx = new Context();
        ctx.setId(1L);
        return ctx;
    }

    @Test
    void submitAnswerGradesAndPersistsResult() {
        UUID userId = UUID.randomUUID();
        CourseSection section = sectionWithCourse(20L, 2L);
        SectionVideoCheckpoint cp = checkpoint(5L, section, 100L);
        when(checkpointRepository.findById(5L)).thenReturn(Optional.of(cp));
        when(gradingService.grade(eq(100L), any()))
                .thenReturn(new GradingService.GradeResult(true, true));
        when(answerRepository.findByUserIdAndCheckpointId(userId, 5L)).thenReturn(Optional.empty());

        var result = service.submitAnswer(userId, 5L, json.readTree("{\"selectedOptionId\":1}"));

        assertThat(result.checkpointId()).isEqualTo(5L);
        assertThat(result.correct()).isTrue();
        assertThat(result.autoGraded()).isTrue();
    }
}
