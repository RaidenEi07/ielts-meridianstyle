package com.meridian.gradebook;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.catalog.Enrollment;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.common.ApiException;
import com.meridian.gradebook.dto.ReportDtos.CourseGradebook;
import com.meridian.gradebook.dto.ReportDtos.SectionGradebook;
import com.meridian.gradebook.dto.ReportDtos.SectionGradebookStudentRow;
import com.meridian.question.QuestionService;
import com.meridian.quiz.Quiz;
import com.meridian.quiz.QuizAttempt;
import com.meridian.quiz.QuizAttemptAnswerRepository;
import com.meridian.quiz.QuizAttemptRepository;
import com.meridian.quiz.QuizQuestionRepository;
import com.meridian.quiz.QuizRepository;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Bảng điểm theo section và danh sách học viên ghi danh trong sổ điểm khóa học. */
@ExtendWith(MockitoExtension.class)
class SectionGradebookTest {

    @Mock private QuizAttemptRepository attemptRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private CourseSectionRepository courseSectionRepository;
    @Mock private UserRepository userRepository;
    @Mock private PermissionService permissionService;
    @Mock private ContextService contextService;
    @Mock private QuizAttemptAnswerRepository answerRepository;
    @Mock private QuizQuestionRepository quizQuestionRepository;
    @Mock private QuestionService questionService;

    private final UUID admin = UUID.randomUUID();
    private Course course;
    private CourseSection unit1;
    private CourseSection unit2;
    private Quiz homework1;
    private Quiz homework2;
    private User an;
    private User binh;

    @BeforeEach
    void setUp() {
        Context ctx = new Context();
        ctx.setId(10L);
        course = new Course();
        course.setId(1L);
        course.setTitle("IELTS Foundation");
        course.setContext(ctx);

        unit1 = section(5L, "UNIT 1_listening");
        unit2 = section(6L, "UNIT 2_reading");

        // homework2 có sortOrder nhỏ hơn nên phải đứng trước homework1 trong bảng.
        homework1 = quiz(100L, "Homework 1", unit1, 2);
        homework2 = quiz(101L, "Homework 2", unit1, 1);

        an = user("An Nguyen", "an", "an@example.com");
        binh = user("Binh Tran", "binh", "binh@example.com");
    }

    private ReportService service() {
        return new ReportService(attemptRepository, quizRepository, enrollmentRepository,
                courseRepository, courseSectionRepository, userRepository, permissionService,
                contextService, answerRepository, quizQuestionRepository, questionService);
    }

    private CourseSection section(Long id, String title) {
        CourseSection s = new CourseSection();
        s.setId(id);
        s.setTitle(title);
        s.setCourse(course);
        return s;
    }

    private Quiz quiz(Long id, String title, CourseSection section, int sortOrder) {
        Quiz q = new Quiz();
        q.setId(id);
        q.setTitle(title);
        q.setSection(section);
        q.setSortOrder(sortOrder);
        return q;
    }

    private User user(String fullName, String username, String email) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setFullName(fullName);
        u.setUsername(username);
        u.setEmail(email);
        return u;
    }

    private Enrollment enrollment(User u, Instant at) {
        Enrollment e = new Enrollment();
        e.setUser(u);
        e.setCourse(course);
        e.setEnrolledAt(at);
        return e;
    }

    private QuizAttempt attempt(Quiz q, User u, String raw, String max) {
        QuizAttempt a = new QuizAttempt();
        a.setQuiz(q);
        a.setUserId(u.getId());
        a.setRawScore(raw == null ? null : new BigDecimal(raw));
        a.setMaxScore(max == null ? null : new BigDecimal(max));
        return a;
    }

    private void stubSectionData() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(courseSectionRepository.findById(5L)).thenReturn(Optional.of(unit1));
        when(quizRepository.findBySectionIdIn(List.of(5L))).thenReturn(List.of(homework1, homework2));
        // Trả Bình trước An để chắc chắn kết quả được sắp xếp theo tên chứ không phụ thuộc thứ tự từ DB.
        when(enrollmentRepository.findByCourseId(1L)).thenReturn(List.of(
                enrollment(binh, Instant.parse("2026-10-02T00:00:00Z")),
                enrollment(an, Instant.parse("2026-10-01T00:00:00Z"))));
        when(attemptRepository.findByQuizIdIn(anyList())).thenReturn(List.of(
                attempt(homework1, an, "6", "10"),
                attempt(homework1, an, "8", "10"),
                attempt(homework1, binh, null, "10"),
                attempt(homework2, binh, "5", "10")));
    }

    @Test
    void sectionGradebook_columnsFollowQuizSortOrder_rowsSortedByName() {
        stubSectionData();

        SectionGradebook result = service().sectionGradebook(admin, 1L, 5L);

        assertThat(result.sectionTitle()).isEqualTo("UNIT 1_listening");
        assertThat(result.quizzes()).extracting("quizTitle").containsExactly("Homework 2", "Homework 1");
        assertThat(result.students()).extracting(SectionGradebookStudentRow::userName)
                .containsExactly("An Nguyen", "Binh Tran");
    }

    @Test
    void sectionGradebook_usesBestAttemptPerQuiz_andMarksUngradedAndMissingCells() {
        stubSectionData();

        SectionGradebook result = service().sectionGradebook(admin, 1L, 5L);

        SectionGradebookStudentRow rowAn = result.students().get(0);
        // Cột 0 = Homework 2 (An chưa làm), cột 1 = Homework 1 (làm 2 lần: 6 và 8 → lấy 8).
        assertThat(rowAn.cells().get(0).attempts()).isZero();
        assertThat(rowAn.cells().get(0).rawScore()).isNull();
        assertThat(rowAn.cells().get(1).rawScore()).isEqualByComparingTo("8");
        assertThat(rowAn.cells().get(1).percent()).isEqualByComparingTo("80");
        assertThat(rowAn.cells().get(1).attempts()).isEqualTo(2);
        assertThat(rowAn.cells().get(1).graded()).isTrue();
        assertThat(rowAn.quizzesAttempted()).isEqualTo(1);
        assertThat(rowAn.avgPercent()).isEqualByComparingTo("80");

        SectionGradebookStudentRow rowBinh = result.students().get(1);
        // Homework 2: 5/10 → 50%. Homework 1: đã làm nhưng chưa có điểm → không tính vào trung bình.
        assertThat(rowBinh.cells().get(0).percent()).isEqualByComparingTo("50");
        assertThat(rowBinh.cells().get(1).attempts()).isEqualTo(1);
        assertThat(rowBinh.cells().get(1).graded()).isFalse();
        assertThat(rowBinh.cells().get(1).percent()).isNull();
        assertThat(rowBinh.quizzesAttempted()).isEqualTo(2);
        assertThat(rowBinh.avgPercent()).isEqualByComparingTo("50");
    }

    @Test
    void sectionGradebook_sectionOfAnotherCourse_isNotFound() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        Course other = new Course();
        other.setId(2L);
        CourseSection foreign = new CourseSection();
        foreign.setId(9L);
        foreign.setCourse(other);
        when(courseSectionRepository.findById(9L)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service().sectionGradebook(admin, 1L, 9L))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void sectionGradebook_withoutReportCapability_isRejectedBeforeAnyDataIsRead() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        doThrow(ApiException.forbidden("Thiếu quyền")).when(permissionService)
                .requireCapability(eq(admin), eq("report:viewlive"), anyLong());

        assertThatThrownBy(() -> service().sectionGradebook(admin, 1L, 5L))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void courseGradebook_listsEnrolledStudentsWithEmailAndDate_andSectionSummaries() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        // unit2 không có đề thi → không được xuất hiện trong tổng quan theo section.
        when(courseSectionRepository.findByCourseIdOrderBySortOrderAscIdAsc(1L))
                .thenReturn(List.of(unit1, unit2));
        when(quizRepository.findBySectionIdIn(anyList())).thenReturn(List.of(homework1, homework2));
        when(attemptRepository.findByQuizIdIn(anyList())).thenReturn(List.of(
                attempt(homework1, an, "8", "10"),
                attempt(homework2, an, "6", "10"),
                attempt(homework2, binh, "5", "10")));
        Instant enrolledAt = Instant.parse("2026-10-01T00:00:00Z");
        when(enrollmentRepository.findByCourseId(1L)).thenReturn(List.of(
                enrollment(an, enrolledAt), enrollment(binh, Instant.parse("2026-10-02T00:00:00Z"))));

        CourseGradebook result = service().courseGradebook(admin, 1L);

        assertThat(result.students()).hasSize(2);
        assertThat(result.students().get(0).username()).isEqualTo("an");
        assertThat(result.students().get(0).email()).isEqualTo("an@example.com");
        assertThat(result.students().get(0).enrolledAt()).isEqualTo(enrolledAt);

        assertThat(result.sections()).hasSize(1);
        var section = result.sections().get(0);
        assertThat(section.sectionTitle()).isEqualTo("UNIT 1_listening");
        assertThat(section.quizCount()).isEqualTo(2);
        assertThat(section.studentsAttempted()).isEqualTo(2);
        // An: (80 + 60) / 2 = 70; Bình: 50 → trung bình các học viên = 60.
        assertThat(section.avgPercent()).isEqualByComparingTo("60");
    }
}
