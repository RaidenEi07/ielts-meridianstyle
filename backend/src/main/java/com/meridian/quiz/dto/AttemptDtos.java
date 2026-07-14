package com.meridian.quiz.dto;

import com.meridian.question.Audience;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

/** DTO cho luồng làm bài (player) và quản lý lượt làm (teacher). */
public final class AttemptDtos {

    private AttemptDtos() {
    }

    /** Lựa chọn hiển thị cho thí sinh — KHÔNG kèm cờ đáp án đúng. */
    public record PlayerOption(Long id, String content) {
    }

    /** Cặp Matching hiển thị cho thí sinh — chỉ có vế trái, không kèm vế phải đúng. */
    public record PlayerMatchingPair(Long id, String leftItem, String leftImageUrl) {
    }

    /** Một lựa chọn trong pool vế phải (đã xáo trộn) — value dùng để so khớp khi chấm. */
    public record PlayerMatchingOption(String value, String imageUrl) {
    }

    /** Item kéo-thả hiển thị cho thí sinh — KHÔNG kèm target đúng. */
    public record PlayerDragItem(Long id, String content) {
    }

    /** Vùng thả trên ảnh — vị trí không phải bí mật, chỉ item->zone mới là đáp án. */
    public record PlayerDragZone(Long id, String label, int x, int y, int width, int height) {
    }

    /** Ô điền khuyết — kèm options (nếu SELECT), KHÔNG kèm acceptedAnswers. */
    public record PlayerClozeSubAnswer(Long id, int subIndex, String subType, JsonNode options) {
    }

    /** Câu hỏi cho thí sinh — đã loại bỏ mọi thông tin đáp án. */
    public record PlayerQuestion(
            Long quizQuestionId,
            Long questionId,
            String type,
            String name,
            String stem,
            BigDecimal mark,
            Long pageId,
            JsonNode settings,
            List<PlayerOption> options,
            List<PlayerMatchingPair> matchingPairs,
            List<PlayerMatchingOption> matchingRightPool,
            List<PlayerDragItem> dragItems,
            List<PlayerDragZone> dragZones,
            List<PlayerClozeSubAnswer> clozeSubAnswers,
            Audience audience) {
    }

    /** Một trang thi (Part) kèm passage/audio để render split-pane / listening. */
    public record PagePlayer(
            Long id,
            int pageNumber,
            String partLabel,
            Long passageId,
            String passageTitle,
            String passageKind,
            String passageContent,
            String passageAudioUrl) {
    }

    /** Toàn bộ trạng thái lượt làm cho thí sinh. */
    public record AttemptPlayer(
            Long attemptId,
            Long quizId,
            String quizTitle,
            String status,
            Instant startedAt,
            Instant deadlineAt,
            Integer timeLimitSeconds,
            boolean antiCheatEnabled,
            int maxViolations,
            int violations,
            String examTemplateCode,
            List<PagePlayer> pages,
            List<PlayerQuestion> questions,
            Map<Long, JsonNode> savedAnswers) {
    }

    /**
     * explanation/answerParagraphIndex/answerParagraphHtml chỉ populate ở kết quả
     * SAU KHI nộp bài ({@link com.meridian.quiz.AttemptService#buildResult}) —
     * KHÔNG bao giờ xuất hiện ở {@link PlayerQuestion} trong lúc đang làm bài.
     */
    public record GradedItem(
            Long quizQuestionId,
            String type,
            String name,
            BigDecimal mark,
            BigDecimal awardedMark,
            Boolean correct,
            String explanation,
            Integer answerParagraphIndex,
            String answerParagraphHtml) {
    }

    public record AttemptResult(
            Long attemptId,
            String status,
            BigDecimal rawScore,
            BigDecimal maxScore,
            BigDecimal bandScore,
            int violations,
            Instant submittedAt,
            List<GradedItem> breakdown) {
    }

    /** Tóm tắt lượt làm cho giáo viên. */
    public record AttemptSummary(
            Long id,
            UUID userId,
            int attemptNumber,
            String status,
            Instant startedAt,
            Instant submittedAt,
            BigDecimal rawScore,
            BigDecimal maxScore,
            BigDecimal bandScore,
            int violations) {
    }

    public record LogDto(Long id, String eventType, String detail, Instant createdAt) {
    }

    /** Phản hồi khi log sự kiện anti-cheat. */
    public record ViolationResult(int violations, boolean autoSubmitted) {
    }
}
