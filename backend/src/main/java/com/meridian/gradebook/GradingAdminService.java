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
import java.util.UUID;
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

    /** Danh sách câu trả lời của một lượt làm (kèm answerId) cho giáo viên chấm. */
    @Transactional(readOnly = true)
    public List<AnswerGradingDto> answersForGrading(UUID uid, Long attemptId) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy lượt làm"));
        permissionService.requireCapability(uid, "quiz:regrade", ctxId(attempt.getQuiz().getContext()));

        return answerRepository.findByAttemptId(attemptId).stream().map(a -> {
            QuizQuestion qq = quizQuestionRepository.findById(a.getQuizQuestionId()).orElse(null);
            var q = qq != null ? questionService.getQuestion(qq.getQuestionId()) : null;
            String type = q != null ? q.type() : null;
            return new AnswerGradingDto(a.getId(), a.getQuizQuestionId(), type,
                    q != null ? q.name() : null, a.getResponse(),
                    qq != null ? qq.getMark() : null, a.getAwardedMark(), a.getCorrect(),
                    "ESSAY".equals(type));
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
