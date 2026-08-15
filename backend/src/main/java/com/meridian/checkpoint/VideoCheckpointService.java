package com.meridian.checkpoint;

import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.checkpoint.dto.CheckpointAnswerResultDto;
import com.meridian.checkpoint.dto.CheckpointQuestionDto;
import com.meridian.checkpoint.dto.VideoCheckpointDto;
import com.meridian.checkpoint.dto.VideoCheckpointRequests;
import com.meridian.common.ApiException;
import com.meridian.question.QuestionRepository;
import com.meridian.question.QuestionService;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.quiz.GradingService;
import com.meridian.quiz.dto.AttemptDtos.PlayerClozeSubAnswer;
import com.meridian.quiz.dto.AttemptDtos.PlayerDragItem;
import com.meridian.quiz.dto.AttemptDtos.PlayerDragZone;
import com.meridian.quiz.dto.AttemptDtos.PlayerGridColumn;
import com.meridian.quiz.dto.AttemptDtos.PlayerGridRow;
import com.meridian.quiz.dto.AttemptDtos.PlayerMatchingOption;
import com.meridian.quiz.dto.AttemptDtos.PlayerMatchingPair;
import com.meridian.quiz.dto.AttemptDtos.PlayerOption;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

/**
 * Câu hỏi popup gắn theo mốc thời gian video (khóa học lõi kiểu Coursera).
 * Không viết lại logic chấm điểm — dùng lại {@link GradingService#grade}
 * đúng như cách chấm 1 câu hỏi thường.
 */
@Service
public class VideoCheckpointService {

    private static final String CAP = "course:manage";

    private final SectionVideoCheckpointRepository checkpointRepository;
    private final VideoCheckpointAnswerRepository answerRepository;
    private final CourseSectionRepository sectionRepository;
    private final QuestionRepository questionRepository;
    private final QuestionService questionService;
    private final GradingService gradingService;
    private final ContextService contextService;
    private final PermissionService permissionService;

    public VideoCheckpointService(SectionVideoCheckpointRepository checkpointRepository,
            VideoCheckpointAnswerRepository answerRepository,
            CourseSectionRepository sectionRepository, QuestionRepository questionRepository,
            QuestionService questionService, GradingService gradingService,
            ContextService contextService, PermissionService permissionService) {
        this.checkpointRepository = checkpointRepository;
        this.answerRepository = answerRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
        this.questionService = questionService;
        this.gradingService = gradingService;
        this.contextService = contextService;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public List<VideoCheckpointDto> listForStudent(UUID userId, Long sectionId) {
        List<SectionVideoCheckpoint> checkpoints =
                checkpointRepository.findBySectionIdOrderBySortOrderAscIdAsc(sectionId);
        if (checkpoints.isEmpty()) {
            return List.of();
        }
        List<Long> ids = checkpoints.stream().map(SectionVideoCheckpoint::getId).toList();
        Set<Long> answeredIds = answerRepository.findByUserIdAndCheckpointIdIn(userId, ids).stream()
                .map(VideoCheckpointAnswer::getCheckpointId)
                .collect(Collectors.toSet());
        return checkpoints.stream().map(c -> toDto(c, answeredIds.contains(c.getId()))).toList();
    }

    @Transactional
    public List<VideoCheckpointDto> replaceForSection(UUID userId, Long sectionId,
            List<VideoCheckpointRequests.ReplaceCheckpoints.CheckpointItem> items) {
        CourseSection section = requireSection(sectionId);
        permissionService.requireCapability(userId, CAP, contextIdOf(section.getCourse().getContext()));

        checkpointRepository.deleteBySectionId(sectionId);

        int i = 0;
        List<SectionVideoCheckpoint> saved = new ArrayList<>();
        for (var item : items) {
            questionRepository.findById(item.questionId())
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu hỏi " + item.questionId()));
            SectionVideoCheckpoint checkpoint = new SectionVideoCheckpoint();
            checkpoint.setSection(section);
            checkpoint.setTimestampSec(item.timestampSec());
            checkpoint.setQuestionId(item.questionId());
            checkpoint.setSortOrder(item.sortOrder() != null ? item.sortOrder() : i++);
            saved.add(checkpointRepository.save(checkpoint));
        }
        return saved.stream().map(c -> toDto(c, false)).toList();
    }

    @Transactional
    public CheckpointAnswerResultDto submitAnswer(UUID userId, Long checkpointId, JsonNode answer) {
        SectionVideoCheckpoint checkpoint = checkpointRepository.findById(checkpointId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy checkpoint"));
        GradingService.GradeResult result = gradingService.grade(checkpoint.getQuestionId(), answer);

        VideoCheckpointAnswer entity = answerRepository.findByUserIdAndCheckpointId(userId, checkpointId)
                .orElseGet(VideoCheckpointAnswer::new);
        entity.setUserId(userId);
        entity.setCheckpointId(checkpointId);
        entity.setCorrect(result.correct());
        answerRepository.save(entity);

        return new CheckpointAnswerResultDto(checkpointId, result.correct(), result.autoGraded());
    }

    @Transactional(readOnly = true)
    public CheckpointQuestionDto getPlayerQuestion(Long checkpointId) {
        SectionVideoCheckpoint checkpoint = checkpointRepository.findById(checkpointId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy checkpoint"));
        QuestionDetailDto q = questionService.getQuestion(checkpoint.getQuestionId());

        List<PlayerOption> options = List.of();
        List<PlayerMatchingPair> matchingPairs = List.of();
        List<PlayerMatchingOption> matchingRightPool = List.of();
        List<PlayerDragItem> dragItems = List.of();
        List<PlayerDragZone> dragZones = List.of();
        List<PlayerClozeSubAnswer> clozeSubAnswers = List.of();
        List<PlayerGridColumn> gridColumns = List.of();
        List<PlayerGridRow> gridRows = List.of();
        JsonNode settings = null;

        switch (q.type()) {
            case "MULTIPLE_CHOICE", "TRUE_FALSE_NOT_GIVEN" -> {
                options = q.options().stream()
                        .map(o -> new PlayerOption(o.id(), o.content()))
                        .toList();
                settings = q.settings();
            }
            case "MATCHING" -> {
                matchingPairs = q.matchingPairs().stream()
                        .map(p -> new PlayerMatchingPair(p.id(), p.leftItem(), p.leftImageUrl()))
                        .toList();
                List<PlayerMatchingOption> pool = new ArrayList<>(q.matchingPairs().stream()
                        .map(p -> new PlayerMatchingOption(p.rightItem(), p.rightImageUrl()))
                        .toList());
                Collections.shuffle(pool);
                matchingRightPool = pool;
            }
            case "DRAG_DROP_TEXT", "DRAG_DROP_MARKER" -> {
                dragItems = q.dragItems().stream()
                        .map(d -> new PlayerDragItem(d.id(), d.content()))
                        .toList();
                dragZones = q.dragZones().stream()
                        .map(z -> new PlayerDragZone(z.id(), z.label(), z.x(), z.y(), z.width(), z.height()))
                        .toList();
                settings = q.settings();
            }
            case "CLOZE" -> clozeSubAnswers = q.clozeSubAnswers().stream()
                    .map(c -> new PlayerClozeSubAnswer(c.id(), c.subIndex(), c.subType(), c.options()))
                    .toList();
            case "GRID_MATCHING" -> {
                // settings mang keyTableHeading (tiêu đề bảng chú giải) — xem giải
                // thích chi tiết ở AttemptService case "GRID_MATCHING" tương ứng.
                settings = q.settings();
                gridColumns = q.gridColumns().stream()
                        .map(c -> new PlayerGridColumn(c.label(), c.description()))
                        .toList();
                gridRows = q.gridRows().stream()
                        .map(r -> new PlayerGridRow(r.id(), r.rowText()))
                        .toList();
            }
            default -> {
            }
        }

        return new CheckpointQuestionDto(checkpoint.getQuestionId(),
                q.type(), q.name(), q.stem(), settings, options, matchingPairs, matchingRightPool,
                dragItems, dragZones, clozeSubAnswers, gridColumns, gridRows, q.audience());
    }

    private VideoCheckpointDto toDto(SectionVideoCheckpoint c, boolean answered) {
        return new VideoCheckpointDto(c.getId(), c.getSection().getId(), c.getTimestampSec(),
                c.getQuestionId(), c.getSortOrder(), answered);
    }

    private CourseSection requireSection(Long id) {
        return sectionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy section"));
    }

    private Long contextIdOf(Context ctx) {
        return ctx == null ? contextService.requireSystemContext().getId() : ctx.getId();
    }
}
