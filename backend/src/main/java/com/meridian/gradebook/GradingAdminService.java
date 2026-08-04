package com.meridian.gradebook;

import com.meridian.common.ApiException;
import com.meridian.gradebook.dto.AnswerGradingDto;
import com.meridian.gradebook.dto.GradeAnswerRequest;
import com.meridian.gradebook.dto.GradeHistoryDto;
import com.meridian.question.QuestionService;
import com.meridian.quiz.AttemptService;
import com.meridian.quiz.QuizAttempt;
import com.meridian.quiz.QuizAttemptAnswer;
import com.meridian.quiz.QuizAttemptAnswerRepository;
import com.meridian.quiz.QuizAttemptRepository;
import com.meridian.quiz.QuizQuestion;
import com.meridian.quiz.QuizQuestionRepository;
import com.meridian.quiz.dto.AttemptDtos.AttemptResult;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Chấm tay câu trả lời (Essay) + ghi audit, rồi tính lại điểm lượt làm. */
@Service
public class GradingAdminService {

    private final QuizAttemptAnswerRepository answerRepository;
    private final QuizAttemptRepository attemptRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final GradeHistoryRepository gradeHistoryRepository;
    private final PermissionService permissionService;
    private final ContextService contextService;
    private final AttemptService attemptService;
    private final QuestionService questionService;

    public GradingAdminService(QuizAttemptAnswerRepository answerRepository,
            QuizAttemptRepository attemptRepository,
            QuizQuestionRepository quizQuestionRepository,
            GradeHistoryRepository gradeHistoryRepository,
            PermissionService permissionService, ContextService contextService,
            AttemptService attemptService, QuestionService questionService) {
        this.answerRepository = answerRepository;
        this.attemptRepository = attemptRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.gradeHistoryRepository = gradeHistoryRepository;
        this.permissionService = permissionService;
        this.contextService = contextService;
        this.attemptService = attemptService;
        this.questionService = questionService;
    }

    /**
     * Danh sách câu trả lời của một lượt làm (kèm answerId) cho giáo viên chấm.
     * Duyệt theo TOÀN BỘ câu hỏi của quiz (không chỉ những câu đã có trong
     * quiz_attempt_answers) — thí sinh bỏ trống 1 câu thì không có row nào cho
     * câu đó, nếu chỉ liệt kê theo answerRepository sẽ lặng lẽ thiếu mất các
     * câu bị bỏ trống, gây hiểu lầm khi đối chiếu với điểm tổng của lượt làm.
     */
    @Transactional(readOnly = true)
    public List<AnswerGradingDto> answersForGrading(UUID uid, Long attemptId) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy lượt làm"));
        permissionService.requireCapability(uid, "quiz:regrade", ctxId(attempt.getQuiz().getContext()));

        Map<Long, QuizAttemptAnswer> answersByQuizQuestionId = answerRepository.findByAttemptId(attemptId)
                .stream()
                .collect(Collectors.toMap(QuizAttemptAnswer::getQuizQuestionId, a -> a));

        List<QuizQuestion> quizQuestions =
                quizQuestionRepository.findByQuizIdOrderBySortOrderAscIdAsc(attempt.getQuiz().getId());

        return quizQuestions.stream().map(qq -> {
            var q = questionService.getQuestion(qq.getQuestionId());
            String type = q.type();
            QuizAttemptAnswer a = answersByQuizQuestionId.get(qq.getId());
            if (a == null) {
                return new AnswerGradingDto(null, qq.getId(), type, q.name(), null,
                        qq.getMark(), BigDecimal.ZERO, null, "ESSAY".equals(type), false);
            }
            return new AnswerGradingDto(a.getId(), qq.getId(), type, q.name(), a.getResponse(),
                    qq.getMark(), a.getAwardedMark(), a.getCorrect(), "ESSAY".equals(type), true);
        }).toList();
    }

    @Transactional
    public AttemptResult gradeAnswer(UUID uid, Long attemptId, Long answerId,
            GradeAnswerRequest req) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy lượt làm"));
        permissionService.requireCapability(uid, "quiz:regrade", ctxId(attempt.getQuiz().getContext()));

        QuizAttemptAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu trả lời"));
        if (!answer.getAttemptId().equals(attemptId)) {
            throw ApiException.badRequest("Câu trả lời không thuộc lượt làm này");
        }

        QuizQuestion qq = quizQuestionRepository.findById(answer.getQuizQuestionId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu trong quiz"));
        BigDecimal mark = req.awardedMark();
        if (mark.compareTo(BigDecimal.ZERO) < 0 || mark.compareTo(qq.getMark()) > 0) {
            throw ApiException.badRequest("Điểm phải trong khoảng 0.." + qq.getMark());
        }

        GradeHistory history = new GradeHistory();
        history.setAttemptId(attemptId);
        history.setAnswerId(answerId);
        history.setChangedBy(uid);
        history.setOldMark(answer.getAwardedMark());
        history.setNewMark(mark);
        history.setReason(req.reason());
        gradeHistoryRepository.save(history);

        answer.setAwardedMark(mark);
        answer.setCorrect(mark.compareTo(BigDecimal.ZERO) > 0);
        answerRepository.save(answer);

        return attemptService.recomputeScores(attemptId);
    }

    @Transactional(readOnly = true)
    public List<GradeHistoryDto> history(UUID uid, Long attemptId) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy lượt làm"));
        permissionService.requireCapability(uid, "quiz:regrade", ctxId(attempt.getQuiz().getContext()));
        return gradeHistoryRepository.findByAttemptIdOrderByCreatedAtDesc(attemptId).stream()
                .map(GradeHistoryDto::from).toList();
    }

    private Long ctxId(Context ctx) {
        return ctx == null ? contextService.requireSystemContext().getId() : ctx.getId();
    }
}
