package com.meridian.question;

import com.meridian.common.ApiException;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import com.meridian.question.dto.QuestionSummaryDto;
import com.meridian.question.dto.QuestionUpsertRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * CRUD câu hỏi cho cả 8 loại. Mỗi loại có bộ phận con riêng (options, pairs,
 * drag items/zones, cloze sub-answers); service validate và lưu phần phù hợp.
 */
@Service
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final QuestionMatchingPairRepository matchingRepository;
    private final QuestionDragDropItemRepository dragItemRepository;
    private final QuestionDragDropZoneRepository dragZoneRepository;
    private final QuestionClozeSubAnswerRepository clozeRepository;
    private final QuestionGridColumnRepository gridColumnRepository;
    private final QuestionGridRowRepository gridRowRepository;
    private final QuestionTaxonomyService taxonomyService;
    private final ObjectMapper json;

    public QuestionService(QuestionRepository questionRepository,
            QuestionOptionRepository optionRepository,
            QuestionMatchingPairRepository matchingRepository,
            QuestionDragDropItemRepository dragItemRepository,
            QuestionDragDropZoneRepository dragZoneRepository,
            QuestionClozeSubAnswerRepository clozeRepository,
            QuestionGridColumnRepository gridColumnRepository,
            QuestionGridRowRepository gridRowRepository,
            QuestionTaxonomyService taxonomyService,
            ObjectMapper json) {
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.matchingRepository = matchingRepository;
        this.dragItemRepository = dragItemRepository;
        this.dragZoneRepository = dragZoneRepository;
        this.clozeRepository = clozeRepository;
        this.gridColumnRepository = gridColumnRepository;
        this.gridRowRepository = gridRowRepository;
        this.taxonomyService = taxonomyService;
        this.json = json;
    }

    // ================= Queries =================

    @Transactional(readOnly = true)
    public List<QuestionSummaryDto> listQuestions(Long categoryId, String type, Audience audience) {
        QuestionType qt = type == null || type.isBlank() ? null : parseType(type);
        List<Question> questions;
        if (categoryId != null && qt != null) {
            questions = questionRepository
                    .findByCategoryIdAndTypeOrderByCreatedAtDesc(categoryId, qt);
        } else if (categoryId != null) {
            questions = questionRepository.findByCategoryIdOrderByCreatedAtDesc(categoryId);
        } else if (audience != null && qt != null) {
            questions = questionRepository
                    .findByCategory_AudienceAndTypeOrderByCreatedAtDesc(audience, qt);
        } else if (audience != null) {
            questions = questionRepository.findByCategory_AudienceOrderByCreatedAtDesc(audience);
        } else if (qt != null) {
            questions = questionRepository.findByTypeOrderByCreatedAtDesc(qt);
        } else {
            questions = questionRepository.findAllByOrderByCreatedAtDesc();
        }
        return questions.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public QuestionDetailDto getQuestion(Long id) {
        return toDetail(requireQuestion(id));
    }

    // ================= Create / Update =================

    @Transactional
    public QuestionDetailDto createQuestion(UUID userId, QuestionUpsertRequest req) {
        QuestionType type = parseType(req.type());
        validate(type, req);

        Question q = new Question();
        applyScalars(q, type, req);
        q.setCreatedBy(userId);
        q.setTags(resolveTags(req.tags()));
        q = questionRepository.saveAndFlush(q);

        saveChildren(q.getId(), type, req);
        return toDetail(requireQuestion(q.getId()));
    }

    @Transactional
    public QuestionDetailDto updateQuestion(UUID userId, Long id, QuestionUpsertRequest req) {
        Question q = requireQuestion(id);
        QuestionType type = parseType(req.type());
        validate(type, req);

        applyScalars(q, type, req);
        q.setTags(resolveTags(req.tags()));
        questionRepository.saveAndFlush(q);

        clearChildren(id);
        saveChildren(id, type, req);
        return toDetail(requireQuestion(id));
    }

    /**
     * Đổi CHỈ tên câu hỏi — không đụng gì khác. updateQuestion() ở trên xóa
     * sạch rồi tạo lại toàn bộ phần con (options/clozeSubAnswers/...) mỗi lần
     * gọi (xem clearChildren/saveChildren), tạo ID hoàn toàn mới cho từng
     * dòng — dùng nó chỉ để đổi tên sẽ âm thầm làm mồ côi mọi câu trả lời cũ
     * của học viên đang tham chiếu ID cũ (vd quiz_attempt_answers.response
     * lưu selectedOptionIds theo ID option cũ). Method riêng này chỉ set 1
     * cột name, không đụng bảng con nào.
     */
    @Transactional
    public QuestionDetailDto renameQuestion(UUID userId, Long id, String name) {
        Question q = requireQuestion(id);
        q.setName(name);
        questionRepository.saveAndFlush(q);
        return toDetail(requireQuestion(id));
    }

    @Transactional
    public void deleteQuestion(Long id) {
        Question q = requireQuestion(id);
        q.setDeletedAt(java.time.Instant.now());
        questionRepository.save(q);
    }

    /** Nhân bản một câu hỏi (mọi loại) — tạo câu hỏi mới với cùng nội dung + phần con. */
    @Transactional
    public QuestionDetailDto duplicateQuestion(UUID userId, Long id) {
        QuestionDetailDto src = getQuestion(id);
        QuestionUpsertRequest req = new QuestionUpsertRequest(
                src.categoryId(), src.type(), src.name() + " (bản sao)", src.stem(),
                src.passageId(), src.answerParagraphIndex(), src.explanation(),
                src.defaultMark(), src.settings(), src.tags(),
                src.options(), src.matchingPairs(), src.dragItems(), src.dragZones(),
                src.clozeSubAnswers(), src.gridColumns(), src.gridRows());
        return createQuestion(userId, req);
    }

    /**
     * Sửa hàng loạt câu MCQ có sẵn: câu nào có đúng 1 đáp án đúng nhưng chưa
     * đánh dấu settings.singleAnswer thì tự đánh dấu (né các câu "chọn NHIỀU
     * đáp án" thật đã có sẵn nhiều đáp án đúng — không đụng tới). Áp dụng cho
     * nội dung cũ tạo trước khi có mặc định singleAnswer=true cho câu mới.
     */
    @Transactional
    public List<QuestionSummaryDto> normalizeSingleAnswerMcq() {
        List<Question> mcqQuestions =
                questionRepository.findByTypeOrderByCreatedAtDesc(QuestionType.MULTIPLE_CHOICE);
        List<Long> ids = mcqQuestions.stream().map(Question::getId).toList();
        Map<Long, List<QuestionOption>> optionsByQuestion = optionRepository
                .findByQuestionIdIn(ids).stream()
                .collect(Collectors.groupingBy(QuestionOption::getQuestionId));

        List<QuestionSummaryDto> fixed = new ArrayList<>();
        for (Question q : mcqQuestions) {
            JsonNode settings = parseJson(q.getSettings());
            if (settings != null && settings.path("singleAnswer").asBoolean(false)) {
                continue;
            }
            long correctCount = optionsByQuestion.getOrDefault(q.getId(), List.of()).stream()
                    .filter(QuestionOption::isCorrect).count();
            if (correctCount != 1) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> map = settings != null
                    ? json.convertValue(settings, Map.class)
                    : new LinkedHashMap<>();
            map.put("singleAnswer", true);
            q.setSettings(json.writeValueAsString(map));
            questionRepository.save(q);
            fixed.add(toSummary(q));
        }
        return fixed;
    }

    // ================= Helpers =================

    private void applyScalars(Question q, QuestionType type, QuestionUpsertRequest req) {
        q.setCategory(taxonomyService.requireCategory(req.categoryId()));
        q.setType(type);
        q.setName(req.name());
        q.setStem(req.stem());
        q.setSettings(toJsonString(req.settings()));
        q.setDefaultMark(req.defaultMark() != null ? req.defaultMark() : BigDecimal.ONE);
        if (req.passageId() != null) {
            q.setPassage(taxonomyService.requirePassage(req.passageId()));
        } else {
            q.setPassage(null);
        }
        q.setAnswerParagraphIndex(req.answerParagraphIndex());
        q.setExplanation(req.explanation());
    }

    private Set<QuestionTag> resolveTags(List<String> names) {
        Set<QuestionTag> tags = new LinkedHashSet<>();
        if (names != null) {
            for (String name : names) {
                if (name != null && !name.isBlank()) {
                    tags.add(taxonomyService.getOrCreateTag(name.trim()));
                }
            }
        }
        return tags;
    }

    private void clearChildren(Long questionId) {
        optionRepository.deleteByQuestionId(questionId);
        matchingRepository.deleteByQuestionId(questionId);
        dragItemRepository.deleteByQuestionId(questionId);
        dragZoneRepository.deleteByQuestionId(questionId);
        clozeRepository.deleteByQuestionId(questionId);
        gridColumnRepository.deleteByQuestionId(questionId);
        gridRowRepository.deleteByQuestionId(questionId);
    }

    private void saveChildren(Long qid, QuestionType type, QuestionUpsertRequest req) {
        switch (type) {
            case MULTIPLE_CHOICE, TRUE_FALSE_NOT_GIVEN -> {
                int i = 0;
                for (QuestionParts.Option o : nz(req.options())) {
                    QuestionOption e = new QuestionOption();
                    e.setQuestionId(qid);
                    e.setContent(o.content());
                    e.setCorrect(o.correct());
                    e.setFeedback(o.feedback());
                    e.setSortOrder(o.sortOrder() != 0 ? o.sortOrder() : i++);
                    optionRepository.save(e);
                }
            }
            case MATCHING -> {
                int i = 0;
                for (QuestionParts.MatchingPair p : nz(req.matchingPairs())) {
                    QuestionMatchingPair e = new QuestionMatchingPair();
                    e.setQuestionId(qid);
                    e.setLeftItem(p.leftItem());
                    e.setRightItem(p.rightItem());
                    e.setLeftImageUrl(p.leftImageUrl());
                    e.setRightImageUrl(p.rightImageUrl());
                    e.setSortOrder(p.sortOrder() != 0 ? p.sortOrder() : i++);
                    matchingRepository.save(e);
                }
            }
            case DRAG_DROP_TEXT -> saveDragItems(qid, req);
            case DRAG_DROP_MARKER -> {
                int i = 0;
                for (QuestionParts.DragZone z : nz(req.dragZones())) {
                    QuestionDragDropZone e = new QuestionDragDropZone();
                    e.setQuestionId(qid);
                    e.setLabel(z.label());
                    e.setX(z.x());
                    e.setY(z.y());
                    e.setWidth(z.width());
                    e.setHeight(z.height());
                    e.setSortOrder(z.sortOrder() != 0 ? z.sortOrder() : i++);
                    dragZoneRepository.save(e);
                }
                saveDragItems(qid, req);
            }
            case CLOZE -> {
                int i = 0;
                for (QuestionParts.ClozeSubAnswer c : nz(req.clozeSubAnswers())) {
                    QuestionClozeSubAnswer e = new QuestionClozeSubAnswer();
                    e.setQuestionId(qid);
                    e.setSubIndex(c.subIndex());
                    e.setSubType(parseClozeType(c.subType()));
                    e.setAcceptedAnswers(toJsonString(c.acceptedAnswers()));
                    e.setOptions(toJsonString(c.options()));
                    e.setSortOrder(c.sortOrder() != 0 ? c.sortOrder() : i++);
                    e.setCaseSensitive(c.caseSensitive());
                    clozeRepository.save(e);
                }
            }
            case SHORT_ANSWER, ESSAY -> {
                // Không có bảng con — cấu hình nằm trong settings (acceptedAnswers/rubric).
            }
            case GRID_MATCHING -> {
                int i = 0;
                for (QuestionParts.GridColumn c : nz(req.gridColumns())) {
                    QuestionGridColumn e = new QuestionGridColumn();
                    e.setQuestionId(qid);
                    e.setLabel(c.label());
                    e.setDescription(c.description());
                    e.setSortOrder(c.sortOrder() != 0 ? c.sortOrder() : i++);
                    gridColumnRepository.save(e);
                }
                int j = 0;
                for (QuestionParts.GridRow r : nz(req.gridRows())) {
                    QuestionGridRow e = new QuestionGridRow();
                    e.setQuestionId(qid);
                    e.setRowText(r.rowText());
                    e.setCorrectColumnLabel(r.correctColumnLabel());
                    e.setSortOrder(r.sortOrder() != 0 ? r.sortOrder() : j++);
                    gridRowRepository.save(e);
                }
            }
        }
    }

    private void saveDragItems(Long qid, QuestionUpsertRequest req) {
        int i = 0;
        for (QuestionParts.DragItem d : nz(req.dragItems())) {
            QuestionDragDropItem e = new QuestionDragDropItem();
            e.setQuestionId(qid);
            e.setContent(d.content());
            e.setCorrectTarget(d.correctTarget());
            e.setSortOrder(d.sortOrder() != 0 ? d.sortOrder() : i++);
            dragItemRepository.save(e);
        }
    }

    private void validate(QuestionType type, QuestionUpsertRequest req) {
        switch (type) {
            case MULTIPLE_CHOICE -> {
                if (nz(req.options()).size() < 2) {
                    throw ApiException.badRequest("Multiple Choice cần ít nhất 2 lựa chọn");
                }
                if (nz(req.options()).stream().noneMatch(QuestionParts.Option::correct)) {
                    throw ApiException.badRequest("Cần ít nhất 1 đáp án đúng");
                }
                boolean singleAnswer = req.settings() != null
                        && req.settings().path("singleAnswer").asBoolean(false);
                if (singleAnswer
                        && nz(req.options()).stream().filter(QuestionParts.Option::correct).count() != 1) {
                    throw ApiException.badRequest("Chế độ 1 đáp án cần đúng 1 đáp án đúng");
                }
            }
            case TRUE_FALSE_NOT_GIVEN -> {
                if (nz(req.options()).isEmpty()) {
                    throw ApiException.badRequest(
                            "Cần cung cấp các lựa chọn (True/False/Not Given) và đánh dấu đáp án đúng");
                }
                if (nz(req.options()).stream().filter(QuestionParts.Option::correct).count() != 1) {
                    throw ApiException.badRequest("Cần đúng 1 đáp án đúng");
                }
            }
            case MATCHING -> {
                if (nz(req.matchingPairs()).size() < 2) {
                    throw ApiException.badRequest("Matching cần ít nhất 2 cặp");
                }
            }
            case SHORT_ANSWER -> {
                if (req.settings() == null || !req.settings().has("acceptedAnswers")
                        || !req.settings().get("acceptedAnswers").isArray()
                        || req.settings().get("acceptedAnswers").isEmpty()) {
                    throw ApiException.badRequest(
                            "Short Answer cần settings.acceptedAnswers (mảng đáp án chấp nhận)");
                }
            }
            case DRAG_DROP_TEXT -> {
                if (nz(req.dragItems()).isEmpty()) {
                    throw ApiException.badRequest("Drag-drop into text cần ít nhất 1 item");
                }
            }
            case DRAG_DROP_MARKER -> {
                if (nz(req.dragZones()).isEmpty() || nz(req.dragItems()).isEmpty()) {
                    throw ApiException.badRequest("Drag-drop markers cần ít nhất 1 zone và 1 item");
                }
            }
            case CLOZE -> {
                if (nz(req.clozeSubAnswers()).isEmpty()) {
                    throw ApiException.badRequest("Cloze cần ít nhất 1 ô trả lời");
                }
            }
            case ESSAY -> {
                // Essay không tự chấm — không bắt buộc cấu hình.
            }
            case GRID_MATCHING -> {
                List<QuestionParts.GridColumn> columns = nz(req.gridColumns());
                List<QuestionParts.GridRow> rows = nz(req.gridRows());
                if (columns.size() < 2) {
                    throw ApiException.badRequest("Grid Matching cần ít nhất 2 cột");
                }
                if (rows.isEmpty()) {
                    throw ApiException.badRequest("Grid Matching cần ít nhất 1 hàng");
                }
                Set<String> columnLabels = new LinkedHashSet<>();
                for (QuestionParts.GridColumn c : columns) {
                    columnLabels.add(c.label());
                }
                for (QuestionParts.GridRow r : rows) {
                    if (!columnLabels.contains(r.correctColumnLabel())) {
                        throw ApiException.badRequest(
                                "Mỗi hàng cần chọn đúng 1 cột đã khai báo ở trên");
                    }
                }
            }
        }
    }

    private QuestionSummaryDto toSummary(Question q) {
        return new QuestionSummaryDto(
                q.getId(), q.getType().name(), q.getName(),
                q.getCategory().getId(), q.getCategory().getName(),
                q.getPassage() != null ? q.getPassage().getId() : null,
                q.getDefaultMark(), tagNames(q));
    }

    private QuestionDetailDto toDetail(Question q) {
        Long id = q.getId();
        List<QuestionParts.Option> options = optionRepository
                .findByQuestionIdOrderBySortOrderAsc(id).stream()
                .map(e -> new QuestionParts.Option(e.getId(), e.getContent(),
                        e.isCorrect(), e.getFeedback(), e.getSortOrder()))
                .toList();
        List<QuestionParts.MatchingPair> pairs = matchingRepository
                .findByQuestionIdOrderBySortOrderAsc(id).stream()
                .map(e -> new QuestionParts.MatchingPair(e.getId(), e.getLeftItem(),
                        e.getRightItem(), e.getSortOrder(),
                        e.getLeftImageUrl(), e.getRightImageUrl()))
                .toList();
        List<QuestionParts.DragItem> items = dragItemRepository
                .findByQuestionIdOrderBySortOrderAsc(id).stream()
                .map(e -> new QuestionParts.DragItem(e.getId(), e.getContent(),
                        e.getCorrectTarget(), e.getSortOrder()))
                .toList();
        List<QuestionParts.DragZone> zones = dragZoneRepository
                .findByQuestionIdOrderBySortOrderAsc(id).stream()
                .map(e -> new QuestionParts.DragZone(e.getId(), e.getLabel(), e.getX(),
                        e.getY(), e.getWidth(), e.getHeight(), e.getSortOrder()))
                .toList();
        List<QuestionParts.ClozeSubAnswer> cloze = clozeRepository
                .findByQuestionIdOrderBySubIndexAsc(id).stream()
                .map(e -> new QuestionParts.ClozeSubAnswer(e.getId(), e.getSubIndex(),
                        e.getSubType().name(), parseJson(e.getAcceptedAnswers()),
                        parseJson(e.getOptions()), e.getSortOrder(), e.isCaseSensitive()))
                .toList();
        List<QuestionParts.GridColumn> gridColumns = gridColumnRepository
                .findByQuestionIdOrderBySortOrderAsc(id).stream()
                .map(e -> new QuestionParts.GridColumn(e.getId(), e.getLabel(), e.getDescription(), e.getSortOrder()))
                .toList();
        List<QuestionParts.GridRow> gridRows = gridRowRepository
                .findByQuestionIdOrderBySortOrderAsc(id).stream()
                .map(e -> new QuestionParts.GridRow(e.getId(), e.getRowText(),
                        e.getCorrectColumnLabel(), e.getSortOrder()))
                .toList();

        return new QuestionDetailDto(
                id, q.getType().name(), q.getName(), q.getStem(),
                q.getCategory().getId(), q.getCategory().getName(),
                q.getPassage() != null ? q.getPassage().getId() : null,
                q.getPassage() != null ? q.getPassage().getTitle() : null,
                q.getPassage() != null ? q.getPassage().getContent() : null,
                q.getAnswerParagraphIndex(), q.getExplanation(),
                q.getDefaultMark(), parseJson(q.getSettings()), tagNames(q),
                options, pairs, items, zones, cloze, gridColumns, gridRows,
                q.getCategory().getAudience());
    }

    private List<String> tagNames(Question q) {
        List<String> names = new ArrayList<>();
        q.getTags().forEach(t -> names.add(t.getName()));
        return names;
    }

    private QuestionType parseType(String raw) {
        try {
            return QuestionType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Loại câu hỏi không hợp lệ: " + raw);
        }
    }

    private ClozeSubType parseClozeType(String raw) {
        try {
            return ClozeSubType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw ApiException.badRequest("subType cloze không hợp lệ: " + raw);
        }
    }

    private static <T> List<T> nz(List<T> list) {
        return list == null ? List.of() : list;
    }

    /** JsonNode (DTO) -> chuỗi JSON thô để lưu vào cột jsonb. */
    private String toJsonString(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return json.writeValueAsString(node);
    }

    /** Chuỗi JSON thô (entity) -> JsonNode để trả về DTO. */
    private JsonNode parseJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return json.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private Question requireQuestion(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu hỏi"));
    }
}
