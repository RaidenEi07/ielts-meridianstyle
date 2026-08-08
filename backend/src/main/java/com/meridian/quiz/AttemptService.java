package com.meridian.quiz;

import com.meridian.catalog.EnrollmentRepository;
import com.meridian.common.ApiException;
import com.meridian.question.Passage;
import com.meridian.question.PassageRepository;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import com.meridian.question.QuestionService;
import com.meridian.quiz.dto.AttemptDtos.AttemptPlayer;
import com.meridian.quiz.dto.AttemptDtos.PagePlayer;
import com.meridian.quiz.dto.AttemptDtos.AttemptResult;
import com.meridian.quiz.dto.AttemptDtos.AttemptSummary;
import com.meridian.quiz.dto.AttemptDtos.GradedItem;
import com.meridian.quiz.dto.AttemptDtos.LogDto;
import com.meridian.quiz.dto.AttemptDtos.PlayerClozeSubAnswer;
import com.meridian.quiz.dto.AttemptDtos.PlayerDragItem;
import com.meridian.quiz.dto.AttemptDtos.PlayerDragZone;
import com.meridian.quiz.dto.AttemptDtos.PlayerGridColumn;
import com.meridian.quiz.dto.AttemptDtos.PlayerGridRow;
import com.meridian.quiz.dto.AttemptDtos.PlayerMatchingOption;
import com.meridian.quiz.dto.AttemptDtos.PlayerMatchingPair;
import com.meridian.quiz.dto.AttemptDtos.PlayerOption;
import com.meridian.quiz.dto.AttemptDtos.PlayerQuestion;
import com.meridian.quiz.dto.AttemptDtos.ViolationResult;
import com.meridian.quiz.dto.AttemptRequests;
import com.meridian.progress.LessonProgressService;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class AttemptService {

    private static final Set<String> VIOLATION_EVENTS =
            Set.of("TAB_SWITCH", "FULLSCREEN_EXIT", "WINDOW_BLUR", "COPY_BLOCKED", "PASTE_BLOCKED");

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAttemptRepository attemptRepository;
    private final QuizAttemptAnswerRepository answerRepository;
    private final QuizAttemptLogRepository logRepository;
    private final QuizPageRepository pageRepository;
    private final PassageRepository passageRepository;
    private final QuestionService questionService;
    private final GradingService gradingService;
    private final PermissionService permissionService;
    private final ContextService contextService;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressService lessonProgressService;
    private final ObjectMapper json;

    public AttemptService(QuizRepository quizRepository,
            QuizQuestionRepository quizQuestionRepository,
            QuizAttemptRepository attemptRepository,
            QuizAttemptAnswerRepository answerRepository,
            QuizAttemptLogRepository logRepository, QuizPageRepository pageRepository,
            PassageRepository passageRepository, QuestionService questionService,
            GradingService gradingService, PermissionService permissionService,
            ContextService contextService, EnrollmentRepository enrollmentRepository,
            LessonProgressService lessonProgressService,
            ObjectMapper json) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.logRepository = logRepository;
        this.pageRepository = pageRepository;
        this.passageRepository = passageRepository;
        this.questionService = questionService;
        this.gradingService = gradingService;
        this.permissionService = permissionService;
        this.contextService = contextService;
        this.enrollmentRepository = enrollmentRepository;
        this.lessonProgressService = lessonProgressService;
        this.json = json;
    }

    // ================= Player =================

    @Transactional
    public AttemptPlayer startAttempt(UUID uid, Long quizId) {
        Quiz quiz = requireQuiz(quizId);
        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw ApiException.badRequest("Quiz chưa được xuất bản");
        }
        permissionService.requireCapability(uid, "quiz:attempt", ctxId(quiz.getContext()));
        requireEnrollmentUnlessStaff(uid, quiz);

        List<QuizAttempt> attempts =
                attemptRepository.findByQuizIdAndUserIdOrderByAttemptNumberDesc(quizId, uid);
        if (!attempts.isEmpty()) {
            QuizAttempt latest = attempts.get(0);
            if (latest.getStatus() == AttemptStatus.IN_PROGRESS) {
                if (isExpired(latest)) {
                    finalizeAttempt(latest);
                } else {
                    return playerView(quiz, latest);
                }
            }
        }
        int used = attempts.size();
        if (quiz.getMaxAttempts() > 0 && used >= quiz.getMaxAttempts()) {
            throw ApiException.conflict("Bạn đã hết lượt làm bài");
        }

        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuiz(quiz);
        attempt.setUserId(uid);
        attempt.setAttemptNumber(used + 1);
        attempt.setStatus(AttemptStatus.IN_PROGRESS);
        Instant now = Instant.now();
        if (quiz.getTimeLimitSeconds() != null) {
            attempt.setDeadlineAt(now.plusSeconds(quiz.getTimeLimitSeconds()));
        }
        attempt.setMaxScore(totalMarks(quizId));
        attempt = attemptRepository.save(attempt);
        return playerView(quiz, attempt);
    }

    @Transactional(readOnly = true)
    public AttemptPlayer getAttempt(UUID uid, Long attemptId) {
        QuizAttempt attempt = requireOwnedAttempt(uid, attemptId);
        return playerView(attempt.getQuiz(), attempt);
    }

    @Transactional
    public void saveAnswer(UUID uid, Long attemptId, AttemptRequests.SaveAnswer req) {
        QuizAttempt attempt = requireOwnedAttempt(uid, attemptId);
        ensureInProgress(attempt);
        if (isExpired(attempt)) {
            finalizeAttempt(attempt);
            throw ApiException.badRequest("Đã hết giờ — bài được tự động nộp");
        }
        QuizAttemptAnswer answer = answerRepository
                .findByAttemptIdAndQuizQuestionId(attemptId, req.quizQuestionId())
                .orElseGet(() -> {
                    QuizAttemptAnswer a = new QuizAttemptAnswer();
                    a.setAttemptId(attemptId);
                    a.setQuizQuestionId(req.quizQuestionId());
                    return a;
                });
        answer.setResponse(toJson(req.response()));
        answerRepository.save(answer);
    }

    @Transactional
    public ViolationResult logEvent(UUID uid, Long attemptId, AttemptRequests.LogEvent req) {
        QuizAttempt attempt = requireOwnedAttempt(uid, attemptId);
        ensureInProgress(attempt);

        QuizAttemptLog logEntry = new QuizAttemptLog();
        logEntry.setAttemptId(attemptId);
        logEntry.setEventType(req.eventType());
        logEntry.setDetail(req.detail());
        logRepository.save(logEntry);

        // Chỉ ghi nhận số lần vi phạm — KHÔNG tự nộp bài hộ thí sinh nữa (theo
        // yêu cầu: chỉ cần theo dõi số lần chuyển tab, không ép nộp). Giữ
        // nguyên trường autoSubmitted=false trong response để không đổi DTO,
        // frontend đã bỏ luôn logic tự nộp phía nó nên trường này giờ luôn
        // false, không còn tác dụng.
        if (VIOLATION_EVENTS.contains(req.eventType().toUpperCase())) {
            attempt.setViolations(attempt.getViolations() + 1);
            attemptRepository.save(attempt);
        }
        return new ViolationResult(attempt.getViolations(), false);
    }

    @Transactional
    public AttemptResult submit(UUID uid, Long attemptId) {
        QuizAttempt attempt = requireOwnedAttempt(uid, attemptId);
        if (attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            finalizeAttempt(attempt);
        }
        // Bài đã được chấm/lưu điểm bình thường bên trên bất kể cài đặt này —
        // chỉ chặn TRẢ VỀ điểm/đáp án cho thí sinh nếu giáo viên đã tắt xem
        // lại. Trước đây chỉ chặn lúc quay lại xem sau (getResult()), còn lần
        // đầu ngay-sau-khi-nộp thì luôn hiện — không đúng với tên cài đặt
        // ("xem lại... SAU KHI NỘP" bao gồm cả lần đầu). Ném 403 giống hệt
        // getResult() để frontend dùng chung đúng 1 luồng xử lý.
        Long quizId = attempt.getQuiz().getId();
        if (quizRepository.existsById(quizId) && !attempt.getQuiz().isAllowReviewAfterSubmit()) {
            throw ApiException.forbidden("Giáo viên đã tắt xem lại bài làm cho bài này.");
        }
        return buildResult(attempt);
    }

    /**
     * Xem lại kết quả SAU KHI đã rời trang (tải lại /quay lại từ lịch sử) — gọi
     * riêng khỏi luồng nộp bài (submit() trả kết quả trực tiếp trong response,
     * không gọi lại hàm này), nên chặn ở đây không ảnh hưởng tới việc học viên
     * luôn thấy điểm ngay lúc vừa nộp bài.
     */
    @Transactional(readOnly = true)
    public AttemptResult getResult(UUID uid, Long attemptId) {
        QuizAttempt attempt = requireOwnedAttempt(uid, attemptId);
        // Quiz đã bị xóa mềm (existsById false, xem toSummary()) thì không còn
        // setting nào để chặn theo nữa — không crash, cứ hiện bình thường.
        Long quizId = attempt.getQuiz().getId();
        if (quizRepository.existsById(quizId) && !attempt.getQuiz().isAllowReviewAfterSubmit()) {
            throw ApiException.forbidden("Giáo viên đã tắt xem lại bài làm cho bài này.");
        }
        return buildResult(attempt);
    }

    /**
     * Tính lại tổng điểm từ các awarded_mark hiện có (KHÔNG chấm lại tự động) —
     * dùng sau khi giáo viên chấm tay Essay. Giữ nguyên điểm đã chấm tay.
     */
    @Transactional
    public AttemptResult recomputeScores(Long attemptId) {
        QuizAttempt attempt = requireAttempt(attemptId);
        BigDecimal raw = BigDecimal.ZERO;
        for (QuizAttemptAnswer ans : answerRepository.findByAttemptId(attemptId)) {
            if (ans.getAwardedMark() != null) {
                raw = raw.add(ans.getAwardedMark());
            }
        }
        attempt.setRawScore(raw);
        attempt.setMaxScore(totalMarks(attempt.getQuiz().getId()));
        attempt.setBandScore(computeBand(attempt.getQuiz(), raw));
        if (attempt.getStatus() == AttemptStatus.SUBMITTED) {
            attempt.setStatus(AttemptStatus.GRADED);
        }
        attemptRepository.save(attempt);
        return buildResult(attempt);
    }

    /** Lấy answer trong một attempt (dùng cho chấm tay). */
    @Transactional(readOnly = true)
    public QuizAttempt attemptForGrading(Long attemptId) {
        return requireAttempt(attemptId);
    }

    @Transactional(readOnly = true)
    public List<AttemptSummary> myAttempts(UUID uid) {
        return attemptRepository.findByUserIdOrderByStartedAtDesc(uid).stream()
                .map(this::toSummary).toList();
    }

    // ================= Teacher / admin =================

    @Transactional(readOnly = true)
    public List<AttemptSummary> listQuizAttempts(UUID uid, Long quizId) {
        Quiz quiz = requireQuiz(quizId);
        permissionService.requireCapability(uid, "quiz:overrideattempt", ctxId(quiz.getContext()));
        return attemptRepository.findByQuizIdOrderByStartedAtDesc(quizId).stream()
                .map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<LogDto> attemptLogs(UUID uid, Long attemptId) {
        QuizAttempt attempt = requireAttempt(attemptId);
        permissionService.requireCapability(uid, "quiz:overrideattempt",
                ctxId(attempt.getQuiz().getContext()));
        return logRepository.findByAttemptIdOrderByCreatedAtAsc(attemptId).stream()
                .map(l -> new LogDto(l.getId(), l.getEventType(), l.getDetail(), l.getCreatedAt()))
                .toList();
    }

    @Transactional
    public AttemptSummary override(UUID uid, Long attemptId, AttemptRequests.OverrideAttempt req) {
        QuizAttempt attempt = requireAttempt(attemptId);
        permissionService.requireCapability(uid, "quiz:overrideattempt",
                ctxId(attempt.getQuiz().getContext()));
        int extra = req.extraSeconds() != null ? req.extraSeconds() : 0;
        Instant base = attempt.getDeadlineAt() != null ? attempt.getDeadlineAt() : Instant.now();
        attempt.setDeadlineAt(base.plusSeconds(extra));
        return toSummary(attemptRepository.save(attempt));
    }

    @Transactional
    public AttemptResult regrade(UUID uid, Long attemptId) {
        QuizAttempt attempt = requireAttempt(attemptId);
        permissionService.requireCapability(uid, "quiz:regrade",
                ctxId(attempt.getQuiz().getContext()));
        finalizeAttempt(attempt);
        return buildResult(attempt);
    }

    @Transactional
    public AttemptSummary reopen(UUID uid, Long attemptId) {
        QuizAttempt attempt = requireAttempt(attemptId);
        permissionService.requireCapability(uid, "quiz:overrideattempt",
                ctxId(attempt.getQuiz().getContext()));
        attempt.setStatus(AttemptStatus.IN_PROGRESS);
        attempt.setSubmittedAt(null);
        Integer limit = attempt.getQuiz().getTimeLimitSeconds();
        attempt.setDeadlineAt(limit != null ? Instant.now().plusSeconds(limit) : null);
        return toSummary(attemptRepository.save(attempt));
    }

    @Transactional
    public void deleteAttempt(UUID uid, Long attemptId) {
        QuizAttempt attempt = requireAttempt(attemptId);
        permissionService.requireCapability(uid, "quiz:overrideattempt",
                ctxId(attempt.getQuiz().getContext()));
        attemptRepository.delete(attempt);
    }

    // ================= Core grading =================

    private void finalizeAttempt(QuizAttempt attempt) {
        List<QuizQuestion> quizQuestions =
                quizQuestionRepository.findByQuizIdOrderBySortOrderAscIdAsc(attempt.getQuiz().getId());
        Map<Long, QuizQuestion> byId = new LinkedHashMap<>();
        quizQuestions.forEach(qq -> byId.put(qq.getId(), qq));

        BigDecimal raw = BigDecimal.ZERO;
        for (QuizAttemptAnswer ans : answerRepository.findByAttemptId(attempt.getId())) {
            QuizQuestion qq = byId.get(ans.getQuizQuestionId());
            if (qq == null) continue;
            GradingService.GradeResult res = gradingService.grade(qq.getQuestionId(), parse(ans.getResponse()));
            ans.setCorrect(res.correct());
            if (res.autoGraded()) {
                BigDecimal awarded = qq.getMark().multiply(res.fraction());
                ans.setAwardedMark(awarded);
                raw = raw.add(awarded);
            } else {
                ans.setAwardedMark(null); // Essay: chấm tay
            }
            answerRepository.save(ans);
        }

        attempt.setRawScore(raw);
        attempt.setMaxScore(totalMarks(attempt.getQuiz().getId()));
        attempt.setBandScore(computeBand(attempt.getQuiz(), raw));
        attempt.setStatus(AttemptStatus.GRADED);
        if (attempt.getSubmittedAt() == null) {
            attempt.setSubmittedAt(Instant.now());
        }
        attemptRepository.save(attempt);

        lessonProgressService.markComplete(attempt.getUserId(), attempt.getQuiz().getSection().getId());
    }

    private BigDecimal computeBand(Quiz quiz, BigDecimal raw) {
        var template = quiz.getSection().getCourse().getCategory().getExamTemplate();
        if (template == null || template.getBandScoreConversion() == null) {
            return null;
        }
        JsonNode conv = parse(template.getBandScoreConversion());
        if (conv == null) return null;
        JsonNode scale = conv.get("scale");
        if (scale == null || !scale.isArray()) return null;
        int rawInt = raw.intValue();
        for (JsonNode entry : scale) {
            int min = entry.path("rawMin").asInt(Integer.MIN_VALUE);
            int max = entry.path("rawMax").asInt(Integer.MAX_VALUE);
            if (rawInt >= min && rawInt <= max) {
                return new BigDecimal(entry.path("band").asString("0"));
            }
        }
        return null;
    }

    private AttemptResult buildResult(QuizAttempt attempt) {
        Map<Long, QuizAttemptAnswer> answers = new LinkedHashMap<>();
        answerRepository.findByAttemptId(attempt.getId())
                .forEach(a -> answers.put(a.getQuizQuestionId(), a));

        List<QuizQuestion> quizQuestions =
                quizQuestionRepository.findByQuizIdOrderBySortOrderAscIdAsc(attempt.getQuiz().getId());

        Map<Long, QuestionDetailDto> detailByQuizQuestionId = new LinkedHashMap<>();
        for (QuizQuestion qq : quizQuestions) {
            detailByQuizQuestionId.put(qq.getId(), questionService.getQuestion(qq.getQuestionId()));
        }

        // Số thứ tự "Câu N" thật (khớp màn làm bài) mà MỖI câu hỏi bắt đầu từ
        // đâu — PHẢI duyệt câu hỏi theo đúng thứ tự frontend hiển thị (xem
        // `steps`/`orderedSlots` trong quiz/[attemptId]/page.tsx), KHÔNG phải
        // sort_order thô toàn quiz: frontend nhóm câu hỏi theo TRANG Đọc/Nghe
        // trước (sắp theo pageNumber), rồi mới tới "câu hỏi khác" (không
        // thuộc trang nào) — 1 trang có thể chứa lẫn nhiều loại câu hỏi
        // (MC/TFNG/Cloze...) nên sort_order thô của riêng loại câu hỏi không
        // phản ánh đúng thứ tự thật. ESSAY không tính (hiện riêng "Writing
        // Task N", xem slotCount()). Mỗi ô trống Cloze/nhãn kéo-thả/hàng
        // lưới/đáp-án-đúng-nhiều-trong-MC chiếm 1 số riêng, cộng dồn.
        Set<Long> passagePageIds = new java.util.LinkedHashSet<>();
        for (QuizPage pg : pageRepository.findByQuizIdOrderByPageNumberAsc(attempt.getQuiz().getId())) {
            if (pg.getPassageId() == null) continue;
            Passage p = passageRepository.findById(pg.getPassageId()).orElse(null);
            if (p != null && (p.getKind() == com.meridian.question.PassageKind.READING
                    || p.getKind() == com.meridian.question.PassageKind.LISTENING)) {
                passagePageIds.add(pg.getId());
            }
        }
        Map<Long, List<QuizQuestion>> byPageId = new LinkedHashMap<>();
        List<QuizQuestion> standalone = new ArrayList<>();
        for (QuizQuestion qq : quizQuestions) {
            if ("ESSAY".equals(detailByQuizQuestionId.get(qq.getId()).type())) continue;
            if (qq.getPageId() != null && passagePageIds.contains(qq.getPageId())) {
                byPageId.computeIfAbsent(qq.getPageId(), k -> new ArrayList<>()).add(qq);
            } else {
                standalone.add(qq);
            }
        }
        List<QuizQuestion> orderedForNumbering = new ArrayList<>();
        for (Long pageId : passagePageIds) {
            orderedForNumbering.addAll(byPageId.getOrDefault(pageId, List.of()));
        }
        orderedForNumbering.addAll(standalone);

        Map<Long, Integer> startNumberByQuizQuestionId = new LinkedHashMap<>();
        int runningNumber = 1;
        for (QuizQuestion qq : orderedForNumbering) {
            startNumberByQuizQuestionId.put(qq.getId(), runningNumber);
            runningNumber += com.meridian.question.CorrectAnswerFormatter.slotCount(detailByQuizQuestionId.get(qq.getId()));
        }

        List<GradedItem> breakdown = quizQuestions.stream().map(qq -> {
            QuestionDetailDto q = detailByQuizQuestionId.get(qq.getId());
            QuizAttemptAnswer a = answers.get(qq.getId());
            String paragraphHtml = com.meridian.question.PassageParagraphs
                    .extract(q.passageContent(), q.answerParagraphIndex());
            List<Long> correctOptionIds =
                    ("MULTIPLE_CHOICE".equals(q.type()) || "TRUE_FALSE_NOT_GIVEN".equals(q.type()))
                            ? q.options().stream().filter(QuestionParts.Option::correct)
                                    .map(QuestionParts.Option::id).toList()
                            : List.of();
            return new GradedItem(qq.getId(), q.type(), q.name(), qq.getMark(),
                    a != null ? a.getAwardedMark() : BigDecimal.ZERO,
                    a != null ? a.getCorrect() : Boolean.FALSE,
                    q.explanation(), q.answerParagraphIndex(), paragraphHtml,
                    com.meridian.question.CorrectAnswerFormatter.format(q,
                            startNumberByQuizQuestionId.getOrDefault(qq.getId(), 0)),
                    qq.getGroupIntro(), correctOptionIds);
        }).toList();

        return new AttemptResult(attempt.getId(), attempt.getStatus().name(),
                attempt.getRawScore(), attempt.getMaxScore(), attempt.getBandScore(),
                attempt.getViolations(), attempt.getSubmittedAt(), breakdown);
    }

    // ================= Player view =================

    private AttemptPlayer playerView(Quiz quiz, QuizAttempt attempt) {
        Map<Long, JsonNode> saved = new LinkedHashMap<>();
        answerRepository.findByAttemptId(attempt.getId())
                .forEach(a -> saved.put(a.getQuizQuestionId(), parse(a.getResponse())));

        List<PlayerQuestion> questions =
                quizQuestionRepository.findByQuizIdOrderBySortOrderAscIdAsc(quiz.getId())
                        .stream().map(qq -> {
                            QuestionDetailDto q = questionService.getQuestion(qq.getQuestionId());
                            List<PlayerOption> options = List.of();
                            List<PlayerMatchingPair> matchingPairs = List.of();
                            List<PlayerMatchingOption> matchingRightPool = List.of();
                            List<PlayerDragItem> dragItems = List.of();
                            List<PlayerDragZone> dragZones = List.of();
                            List<PlayerClozeSubAnswer> clozeSubAnswers = List.of();
                            List<PlayerGridColumn> gridColumns = List.of();
                            List<PlayerGridRow> gridRows = List.of();
                            JsonNode settings = null;
                            Integer correctAnswerCount = null;
                            switch (q.type()) {
                                case "MULTIPLE_CHOICE", "TRUE_FALSE_NOT_GIVEN" -> {
                                    options = q.options().stream()
                                            .map(o -> new PlayerOption(o.id(), o.content()))
                                            .toList();
                                    settings = q.settings();
                                    correctAnswerCount = (int) q.options().stream()
                                            .filter(QuestionParts.Option::correct)
                                            .count();
                                }
                                case "MATCHING" -> {
                                    matchingPairs = q.matchingPairs().stream()
                                            .map(p -> new PlayerMatchingPair(
                                                    p.id(), p.leftItem(), p.leftImageUrl()))
                                            .toList();
                                    List<PlayerMatchingOption> pool = new ArrayList<>(
                                            q.matchingPairs().stream()
                                                    .map(p -> new PlayerMatchingOption(
                                                            p.rightItem(), p.rightImageUrl()))
                                                    .toList());
                                    Collections.shuffle(pool);
                                    matchingRightPool = pool;
                                }
                                case "DRAG_DROP_TEXT", "DRAG_DROP_MARKER" -> {
                                    dragItems = q.dragItems().stream()
                                            .map(d -> new PlayerDragItem(d.id(), d.content()))
                                            .toList();
                                    dragZones = q.dragZones().stream()
                                            .map(z -> new PlayerDragZone(z.id(), z.label(),
                                                    z.x(), z.y(), z.width(), z.height()))
                                            .toList();
                                    settings = q.settings();
                                }
                                case "CLOZE" -> clozeSubAnswers = q.clozeSubAnswers().stream()
                                        .map(c -> new PlayerClozeSubAnswer(c.id(), c.subIndex(),
                                                c.subType(), c.options()))
                                        .toList();
                                case "GRID_MATCHING" -> {
                                    gridColumns = q.gridColumns().stream()
                                            .map(c -> new PlayerGridColumn(c.label()))
                                            .toList();
                                    gridRows = q.gridRows().stream()
                                            .map(r -> new PlayerGridRow(r.id(), r.rowText()))
                                            .toList();
                                }
                                default -> {
                                }
                            }
                            return new PlayerQuestion(qq.getId(), qq.getQuestionId(), q.type(),
                                    q.name(), q.stem(), qq.getMark(), qq.getPageId(), q.passageId(),
                                    settings, options, matchingPairs, matchingRightPool, dragItems,
                                    dragZones, clozeSubAnswers, gridColumns, gridRows, q.audience(),
                                    correctAnswerCount, qq.getGroupIntro());
                        }).toList();

        List<PagePlayer> pages = pageRepository.findByQuizIdOrderByPageNumberAsc(quiz.getId())
                .stream().map(pg -> {
                    Passage psg = pg.getPassageId() != null
                            ? passageRepository.findById(pg.getPassageId()).orElse(null)
                            : null;
                    return new PagePlayer(pg.getId(), pg.getPageNumber(), pg.getPartLabel(),
                            pg.getPassageId(),
                            psg != null ? psg.getTitle() : null,
                            psg != null ? psg.getKind().name() : null,
                            psg != null ? psg.getContent() : null,
                            psg != null ? psg.getAudioUrl() : null);
                }).toList();

        var template = quiz.getSection().getCourse().getCategory().getExamTemplate();
        return new AttemptPlayer(attempt.getId(), quiz.getId(), quiz.getTitle(),
                attempt.getStatus().name(), attempt.getStartedAt(), attempt.getDeadlineAt(),
                quiz.getTimeLimitSeconds(), quiz.isAntiCheatEnabled(), quiz.getMaxViolations(),
                attempt.getViolations(), template != null ? template.getCode() : null,
                pages, questions, saved);
    }

    // ================= Helpers =================

    private BigDecimal totalMarks(Long quizId) {
        return quizQuestionRepository.findByQuizIdOrderBySortOrderAscIdAsc(quizId).stream()
                .map(QuizQuestion::getMark)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean isExpired(QuizAttempt a) {
        return a.getDeadlineAt() != null && Instant.now().isAfter(a.getDeadlineAt());
    }

    private void ensureInProgress(QuizAttempt a) {
        if (a.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw ApiException.badRequest("Lượt làm đã kết thúc");
        }
    }

    private AttemptSummary toSummary(QuizAttempt a) {
        // quiz.getId() đọc thẳng từ FK trên proxy lazy, không chạm DB — an toàn
        // kể cả khi quiz đã bị xóa mềm. Chỉ tải đầy đủ (tên quiz/khóa học) khi
        // quiz còn tồn tại, tránh EntityNotFoundException khi liệt kê LỊCH SỬ
        // của học viên có thể dính tới quiz đã bị giáo viên xóa từ lâu.
        Quiz quiz = a.getQuiz();
        Long quizId = quiz.getId();
        String quizTitle = null;
        Long courseId = null;
        String courseTitle = null;
        boolean allowReview = true;
        if (quizRepository.existsById(quizId)) {
            quizTitle = quiz.getTitle();
            var course = quiz.getSection().getCourse();
            courseId = course.getId();
            courseTitle = course.getTitle();
            allowReview = quiz.isAllowReviewAfterSubmit();
        }
        return new AttemptSummary(a.getId(), a.getUserId(), a.getAttemptNumber(),
                a.getStatus().name(), a.getStartedAt(), a.getSubmittedAt(),
                a.getRawScore(), a.getMaxScore(), a.getBandScore(), a.getViolations(),
                quizId, quizTitle, courseId, courseTitle, allowReview);
    }

    private Quiz requireQuiz(Long id) {
        return quizRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy quiz"));
    }

    private QuizAttempt requireAttempt(Long id) {
        return attemptRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy lượt làm"));
    }

    private QuizAttempt requireOwnedAttempt(UUID uid, Long id) {
        QuizAttempt a = requireAttempt(id);
        if (!a.getUserId().equals(uid)) {
            throw ApiException.forbidden("Không phải lượt làm của bạn");
        }
        return a;
    }

    private Long ctxId(Context ctx) {
        return ctx == null ? contextService.requireSystemContext().getId() : ctx.getId();
    }

    /**
     * Học sinh phải được ghi danh khóa học (tự ghi danh hoặc được giáo viên
     * cấp quyền) mới được làm bài. Staff quản lý khóa học đó ('course:manage'
     * tại context của quiz — giáo viên/admin đang xem/kiểm thử quiz của mình)
     * được miễn, vì bản thân họ không phải là học sinh cần ghi danh.
     */
    private void requireEnrollmentUnlessStaff(UUID uid, Quiz quiz) {
        if (permissionService.hasCapability(uid, "course:manage", ctxId(quiz.getContext()))) {
            return;
        }
        Long courseId = quiz.getSection().getCourse().getId();
        if (!enrollmentRepository.existsByUserIdAndCourseId(uid, courseId)) {
            throw ApiException.forbidden(
                    "Bạn cần được ghi danh khóa học này trước khi làm bài");
        }
    }

    private String toJson(JsonNode node) {
        return (node == null || node.isNull()) ? null : json.writeValueAsString(node);
    }

    private JsonNode parse(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return json.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }
}
