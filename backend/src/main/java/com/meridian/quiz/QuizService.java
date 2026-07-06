package com.meridian.quiz;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.common.ApiException;
import com.meridian.question.Question;
import com.meridian.question.QuestionRepository;
import com.meridian.quiz.dto.QuizDtos.QuizDetailDto;
import com.meridian.quiz.dto.QuizDtos.QuizDto;
import com.meridian.quiz.dto.QuizDtos.QuizPageDto;
import com.meridian.quiz.dto.QuizDtos.QuizQuestionDto;
import com.meridian.quiz.dto.QuizRequests;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextType;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Quản lý quiz: CRUD, phân trang, import câu hỏi từ ngân hàng. */
@Service
public class QuizService {

    private static final String CAP = "course:manage";

    private final QuizRepository quizRepository;
    private final QuizPageRepository pageRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final CourseSectionRepository sectionRepository;
    private final QuestionRepository questionRepository;
    private final ContextService contextService;
    private final PermissionService permissionService;

    public QuizService(QuizRepository quizRepository, QuizPageRepository pageRepository,
            QuizQuestionRepository quizQuestionRepository,
            CourseSectionRepository sectionRepository,
            QuestionRepository questionRepository, ContextService contextService,
            PermissionService permissionService) {
        this.quizRepository = quizRepository;
        this.pageRepository = pageRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
        this.contextService = contextService;
        this.permissionService = permissionService;
    }

    // ================= Management =================

    @Transactional
    public QuizDetailDto createQuiz(UUID uid, QuizRequests.CreateQuiz req) {
        CourseSection section = requireSection(req.sectionId());
        Context courseCtx = section.getCourse().getContext();
        permissionService.requireCapability(uid, CAP, contextId(courseCtx));

        Quiz quiz = new Quiz();
        quiz.setSection(section);
        quiz.setSortOrder((int) quizRepository.countBySectionId(section.getId()));
        applyCreate(quiz, req);
        quiz = quizRepository.saveAndFlush(quiz);

        Context ctx = contextService.createContext(ContextType.QUIZ, quiz.getId(), courseCtx);
        quiz.setContext(ctx);
        quiz = quizRepository.save(quiz);
        return detail(quiz);
    }

    @Transactional
    public QuizDetailDto updateQuiz(UUID uid, Long id, QuizRequests.UpdateQuiz req) {
        Quiz quiz = requireQuiz(id);
        permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));
        applyUpdate(quiz, req);
        return detail(quizRepository.save(quiz));
    }

    @Transactional
    public void deleteQuiz(UUID uid, Long id) {
        Quiz quiz = requireQuiz(id);
        permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));
        quiz.setDeletedAt(java.time.Instant.now());
        quizRepository.save(quiz);
    }

    @Transactional(readOnly = true)
    public QuizDetailDto getQuizDetail(UUID uid, Long id) {
        Quiz quiz = requireQuiz(id);
        permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));
        return detail(quiz);
    }

    @Transactional(readOnly = true)
    public List<QuizDto> listBySection(UUID uid, Long sectionId) {
        CourseSection section = requireSection(sectionId);
        permissionService.requireCapability(uid, CAP, contextId(section.getCourse().getContext()));
        return quizRepository.findBySectionIdOrderBySortOrderAscIdAsc(sectionId).stream()
                .map(this::toDto).toList();
    }

    @Transactional
    public List<QuizQuestionDto> importQuestions(UUID uid, Long quizId,
            QuizRequests.ImportQuestions req) {
        Quiz quiz = requireQuiz(quizId);
        permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));

        int order = (int) quizQuestionRepository.countByQuizId(quizId);
        for (Long questionId : req.questionIds()) {
            Question q = questionRepository.findById(questionId)
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu hỏi " + questionId));
            if (quizQuestionRepository.existsByQuizIdAndQuestionId(quizId, questionId)) {
                continue;
            }
            QuizQuestion qq = new QuizQuestion();
            qq.setQuizId(quizId);
            qq.setQuestionId(q.getId());
            qq.setPageId(req.pageId());
            qq.setMark(req.mark() != null ? req.mark() : BigDecimal.ONE);
            qq.setSortOrder(order++);
            quizQuestionRepository.save(qq);
        }
        return listQuizQuestions(quizId);
    }

    @Transactional
    public void removeQuestion(UUID uid, Long quizQuestionId) {
        QuizQuestion qq = quizQuestionRepository.findById(quizQuestionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu trong quiz"));
        Quiz quiz = requireQuiz(qq.getQuizId());
        permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));
        quizQuestionRepository.delete(qq);
    }

    @Transactional
    public QuizPageDto setPage(UUID uid, Long quizId, QuizRequests.SetPage req) {
        Quiz quiz = requireQuiz(quizId);
        permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));
        if (req.pageNumber() < 1 || req.pageNumber() > 3) {
            throw ApiException.badRequest("page_number phải trong khoảng 1..3");
        }
        QuizPage page = pageRepository.findByQuizIdOrderByPageNumberAsc(quizId).stream()
                .filter(p -> p.getPageNumber() == req.pageNumber())
                .findFirst().orElseGet(QuizPage::new);
        page.setQuizId(quizId);
        page.setPageNumber(req.pageNumber());
        page.setPartLabel(req.partLabel());
        page.setPassageId(req.passageId());
        page = pageRepository.save(page);
        return new QuizPageDto(page.getId(), page.getPageNumber(),
                page.getPartLabel(), page.getPassageId());
    }

    @Transactional
    public void deletePage(UUID uid, Long pageId) {
        QuizPage page = pageRepository.findById(pageId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy trang"));
        Quiz quiz = requireQuiz(page.getQuizId());
        permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));
        pageRepository.delete(page);
    }

    @Transactional
    public void reorderQuizzes(UUID uid, List<Long> quizIds) {
        List<Quiz> quizzes = quizRepository.findAllById(quizIds);
        if (quizzes.isEmpty()) {
            return;
        }
        Long sectionId = quizzes.get(0).getSection().getId();
        Map<Long, Quiz> byId = quizzes.stream().collect(Collectors.toMap(Quiz::getId, Function.identity()));
        int order = 0;
        for (Long id : quizIds) {
            Quiz quiz = byId.get(id);
            if (quiz == null || !quiz.getSection().getId().equals(sectionId)) {
                throw ApiException.badRequest("Quiz không hợp lệ: " + id);
            }
            permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));
            quiz.setSortOrder(order++);
        }
        quizRepository.saveAll(quizzes);
    }

    @Transactional
    public void reorderQuestions(UUID uid, Long quizId, List<Long> quizQuestionIds) {
        Quiz quiz = requireQuiz(quizId);
        permissionService.requireCapability(uid, CAP, contextId(quiz.getContext()));

        List<QuizQuestion> items = quizQuestionRepository.findAllById(quizQuestionIds);
        Map<Long, QuizQuestion> byId =
                items.stream().collect(Collectors.toMap(QuizQuestion::getId, Function.identity()));
        int order = 0;
        for (Long id : quizQuestionIds) {
            QuizQuestion qq = byId.get(id);
            if (qq == null || !qq.getQuizId().equals(quizId)) {
                throw ApiException.badRequest("Câu hỏi không hợp lệ trong quiz: " + id);
            }
            qq.setSortOrder(order++);
        }
        quizQuestionRepository.saveAll(items);
    }

    // ================= Student-facing reads =================

    @Transactional(readOnly = true)
    public List<QuizDto> listPublishedByCourse(Long courseId) {
        return sectionRepository.findByCourseIdOrderBySortOrderAscIdAsc(courseId).stream()
                .flatMap(s -> quizRepository.findBySectionIdOrderBySortOrderAscIdAsc(s.getId()).stream())
                .filter(q -> q.getStatus() == QuizStatus.PUBLISHED)
                .map(this::toDto)
                .toList();
    }

    // ================= Helpers =================

    Quiz requireQuiz(Long id) {
        return quizRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy quiz"));
    }

    private CourseSection requireSection(Long id) {
        return sectionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy section"));
    }

    private QuizDetailDto detail(Quiz quiz) {
        List<QuizPageDto> pages = pageRepository
                .findByQuizIdOrderByPageNumberAsc(quiz.getId()).stream()
                .map(p -> new QuizPageDto(p.getId(), p.getPageNumber(),
                        p.getPartLabel(), p.getPassageId()))
                .toList();
        return new QuizDetailDto(toDto(quiz), pages, listQuizQuestions(quiz.getId()));
    }

    private List<QuizQuestionDto> listQuizQuestions(Long quizId) {
        return quizQuestionRepository.findByQuizIdOrderBySortOrderAscIdAsc(quizId).stream()
                .map(qq -> {
                    Question q = questionRepository.findById(qq.getQuestionId()).orElse(null);
                    return new QuizQuestionDto(qq.getId(), qq.getQuestionId(),
                            q != null ? q.getType().name() : null,
                            q != null ? q.getName() : "(đã xóa)",
                            qq.getMark(), qq.getPageId(), qq.getSortOrder());
                })
                .toList();
    }

    QuizDto toDto(Quiz quiz) {
        Course course = quiz.getSection().getCourse();
        var template = course.getCategory().getExamTemplate();
        return new QuizDto(
                quiz.getId(), quiz.getSection().getId(), course.getId(),
                quiz.getTitle(), quiz.getIntro(), quiz.getTimeLimitSeconds(),
                quiz.getMaxAttempts(), quiz.isShuffleQuestions(),
                quiz.isAntiCheatEnabled(), quiz.getMaxViolations(), quiz.getPassMark(),
                quiz.getStatus().name(),
                quiz.getContext() != null ? quiz.getContext().getId() : null,
                quizQuestionRepository.countByQuizId(quiz.getId()),
                template != null ? template.getCode() : null);
    }

    private void applyCreate(Quiz quiz, QuizRequests.CreateQuiz req) {
        quiz.setTitle(req.title());
        quiz.setIntro(req.intro());
        quiz.setTimeLimitSeconds(req.timeLimitSeconds());
        if (req.maxAttempts() != null) quiz.setMaxAttempts(req.maxAttempts());
        if (req.shuffleQuestions() != null) quiz.setShuffleQuestions(req.shuffleQuestions());
        if (req.antiCheatEnabled() != null) quiz.setAntiCheatEnabled(req.antiCheatEnabled());
        if (req.maxViolations() != null) quiz.setMaxViolations(req.maxViolations());
        quiz.setPassMark(req.passMark());
        quiz.setStatus(parseStatus(req.status(), QuizStatus.DRAFT));
    }

    private void applyUpdate(Quiz quiz, QuizRequests.UpdateQuiz req) {
        if (req.title() != null && !req.title().isBlank()) quiz.setTitle(req.title());
        if (req.intro() != null) quiz.setIntro(req.intro());
        if (req.timeLimitSeconds() != null) quiz.setTimeLimitSeconds(req.timeLimitSeconds());
        if (req.maxAttempts() != null) quiz.setMaxAttempts(req.maxAttempts());
        if (req.shuffleQuestions() != null) quiz.setShuffleQuestions(req.shuffleQuestions());
        if (req.antiCheatEnabled() != null) quiz.setAntiCheatEnabled(req.antiCheatEnabled());
        if (req.maxViolations() != null) quiz.setMaxViolations(req.maxViolations());
        if (req.passMark() != null) quiz.setPassMark(req.passMark());
        if (req.status() != null) quiz.setStatus(parseStatus(req.status(), quiz.getStatus()));
    }

    private QuizStatus parseStatus(String raw, QuizStatus fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return QuizStatus.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Trạng thái quiz không hợp lệ: " + raw);
        }
    }

    private Long contextId(Context ctx) {
        return ctx == null ? contextService.requireSystemContext().getId() : ctx.getId();
    }
}
