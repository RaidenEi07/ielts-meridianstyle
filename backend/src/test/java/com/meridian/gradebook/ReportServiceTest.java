package com.meridian.gradebook;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.gradebook.dto.ReportDtos.TypeBreakdown;
import com.meridian.question.QuestionService;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.quiz.AttemptStatus;
import com.meridian.quiz.QuizAttempt;
import com.meridian.quiz.QuizAttemptAnswer;
import com.meridian.quiz.QuizAttemptAnswerRepository;
import com.meridian.quiz.QuizAttemptRepository;
import com.meridian.quiz.QuizQuestion;
import com.meridian.quiz.QuizQuestionRepository;
import com.meridian.quiz.QuizRepository;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Kiểm tra tổng hợp "dạng câu hỏi hay sai" gộp toàn bộ lịch sử làm bài của 1 học viên. */
@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock private QuizAttemptRepository attemptRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private UserRepository userRepository;
    @Mock private PermissionService permissionService;
    @Mock private ContextService contextService;
    @Mock private QuizAttemptAnswerRepository answerRepository;
    @Mock private QuizQuestionRepository quizQuestionRepository;
    @Mock private QuestionService questionService;

    private ReportService reportService() {
        return new ReportService(attemptRepository, quizRepository, enrollmentRepository,
                courseRepository, userRepository, permissionService, contextService,
                answerRepository, quizQuestionRepository, questionService);
    }

    private QuizAttempt attempt(Long id, AttemptStatus status) {
        QuizAttempt a = new QuizAttempt();
        a.setId(id);
        a.setStatus(status);
        return a;
    }

    private QuizAttemptAnswer answer(Long attemptId, Long quizQuestionId, Boolean correct) {
        QuizAttemptAnswer a = new QuizAttemptAnswer();
        a.setAttemptId(attemptId);
        a.setQuizQuestionId(quizQuestionId);
        a.setCorrect(correct);
        return a;
    }

    private QuizQuestion quizQuestion(Long id, Long quizId, Long questionId) {
        QuizQuestion qq = new QuizQuestion();
        qq.setId(id);
        qq.setQuizId(quizId);
        qq.setQuestionId(questionId);
        return qq;
    }

    private QuestionDetailDto questionOfType(Long id, String type) {
        return new QuestionDetailDto(id, type, "Q" + id, "stem", 1L, "cat", null, null, null,
                null, null, null, null, List.of(), List.of(), List.of(), List.of(), List.of(),
                List.of(), List.of(), List.of(), null);
    }

    @Test
    void tallyCountsCorrectAndWrongPerType_acrossMultipleQuizzesAndAttempts_skippingUngraded() {
        UUID userId = UUID.randomUUID();

        // Attempt 1 (GRADED, quiz A): 1 câu MCQ đúng, 1 câu CLOZE sai.
        // Attempt 2 (GRADED, quiz B): 1 câu MCQ sai, 1 câu ESSAY chưa chấm (correct=null, phải bỏ qua).
        // Attempt 3 (IN_PROGRESS): phải bỏ qua toàn bộ, kể cả nếu có answer.
        QuizAttempt a1 = attempt(101L, AttemptStatus.GRADED);
        QuizAttempt a2 = attempt(102L, AttemptStatus.GRADED);
        QuizAttempt a3 = attempt(103L, AttemptStatus.IN_PROGRESS);
        when(attemptRepository.findByUserIdOrderByStartedAtDesc(userId))
                .thenReturn(List.of(a1, a2, a3));

        when(answerRepository.findByAttemptIdIn(List.of(101L, 102L))).thenReturn(List.of(
                answer(101L, 1L, true),
                answer(101L, 2L, false),
                answer(102L, 3L, false),
                answer(102L, 4L, null)));

        when(quizQuestionRepository.findById(1L))
                .thenReturn(Optional.of(quizQuestion(1L, 10L, 1001L)));
        when(quizQuestionRepository.findById(2L))
                .thenReturn(Optional.of(quizQuestion(2L, 10L, 1002L)));
        when(quizQuestionRepository.findById(3L))
                .thenReturn(Optional.of(quizQuestion(3L, 20L, 1003L)));
        // Không stub findById(4L)/getQuestion(1004L) — answer(102L, 4L, null) bị bỏ qua
        // ngay từ đầu (correct == null, ứng với Essay chưa chấm tay) nên không bao giờ
        // tra tới quizQuestion/question của nó.
        when(quizRepository.existsById(10L)).thenReturn(true);
        when(quizRepository.existsById(20L)).thenReturn(true);

        when(questionService.getQuestion(1001L)).thenReturn(questionOfType(1001L, "MULTIPLE_CHOICE"));
        when(questionService.getQuestion(1002L)).thenReturn(questionOfType(1002L, "CLOZE"));
        when(questionService.getQuestion(1003L)).thenReturn(questionOfType(1003L, "MULTIPLE_CHOICE"));

        List<TypeBreakdown> result = reportService().wrongAnswerTypesForUser(userId);

        assertThat(result).hasSize(2);
        TypeBreakdown mcq = result.stream().filter(r -> r.type().equals("MULTIPLE_CHOICE")).findFirst().orElseThrow();
        assertThat(mcq.correctCount()).isEqualTo(1);
        assertThat(mcq.wrongCount()).isEqualTo(1);
        TypeBreakdown cloze = result.stream().filter(r -> r.type().equals("CLOZE")).findFirst().orElseThrow();
        assertThat(cloze.correctCount()).isEqualTo(0);
        assertThat(cloze.wrongCount()).isEqualTo(1);
        // ESSAY không xuất hiện vì answer chưa chấm (correct=null) bị bỏ qua.
        assertThat(result).noneMatch(r -> r.type().equals("ESSAY"));
    }

    @Test
    void noGradedAttempts_returnsEmptyList() {
        UUID userId = UUID.randomUUID();
        when(attemptRepository.findByUserIdOrderByStartedAtDesc(userId))
                .thenReturn(List.of(attempt(1L, AttemptStatus.IN_PROGRESS)));

        assertThat(reportService().wrongAnswerTypesForUser(userId)).isEmpty();
    }
}
