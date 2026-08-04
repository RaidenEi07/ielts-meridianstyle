package com.meridian.quiz;

import com.meridian.question.QuestionService;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.Set;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

/**
 * Tự chấm câu hỏi khách quan. Essay không tự chấm. Đáp án đúng lấy từ
 * QuestionService (chi tiết câu hỏi trong ngân hàng). Phần lớn dạng câu hỏi
 * chấm all-or-nothing (đúng toàn bộ mới được điểm) — riêng CLOZE và
 * MULTIPLE_CHOICE nhiều-đáp-án-đúng chấm theo tỉ lệ từng phần đúng
 * (fraction), vì 1 bản ghi câu hỏi ở 2 dạng này thường đại diện nhiều số
 * thứ tự IELTS thật (nhiều ô trống / nhiều chữ cái cần chọn).
 */
@Service
public class GradingService {

    private final QuestionService questionService;

    public GradingService(QuestionService questionService) {
        this.questionService = questionService;
    }

    /**
     * correct = null nghĩa là cần chấm tay (Essay). correct (khi không null)
     * vẫn giữ nguyên ý nghĩa "đúng TOÀN BỘ hay không" (dùng cho thống kê dạng
     * hay sai) — fraction là tỉ lệ đúng dùng để tính điểm thực tế (luôn đúng
     * 0 hoặc 1 cho các dạng all-or-nothing, chỉ khác 0/1 với CLOZE/MC nhiều
     * đáp án khi đúng một phần).
     */
    public record GradeResult(Boolean correct, BigDecimal fraction, boolean autoGraded) {
        static GradeResult manual() {
            return new GradeResult(null, BigDecimal.ZERO, false);
        }

        static GradeResult of(boolean ok) {
            return new GradeResult(ok, ok ? BigDecimal.ONE : BigDecimal.ZERO, true);
        }

        static GradeResult ofFraction(BigDecimal fraction) {
            boolean ok = fraction.compareTo(BigDecimal.ONE) == 0;
            return new GradeResult(ok, fraction, true);
        }
    }

    public GradeResult grade(Long questionId, JsonNode response) {
        QuestionDetailDto q = questionService.getQuestion(questionId);
        return switch (q.type()) {
            case "MULTIPLE_CHOICE" -> GradeResult.ofFraction(gradeMultiple(q, response));
            case "TRUE_FALSE_NOT_GIVEN" -> GradeResult.of(gradeSingle(q, response));
            case "SHORT_ANSWER" -> GradeResult.of(gradeShortAnswer(q, response));
            case "MATCHING" -> GradeResult.of(gradeMatching(q, response));
            case "CLOZE" -> GradeResult.ofFraction(gradeCloze(q, response));
            case "DRAG_DROP_TEXT", "DRAG_DROP_MARKER" -> GradeResult.of(gradeDrag(q, response));
            case "GRID_MATCHING" -> GradeResult.of(gradeGrid(q, response));
            case "ESSAY" -> GradeResult.manual();
            default -> GradeResult.manual();
        };
    }

    /**
     * Trả về tỉ lệ đúng (0..1). Khi câu hỏi chỉ cho phép 1 đáp án đúng
     * (settings.singleAnswer, hoặc chỉ có đúng 1 đáp án đúng được khai báo)
     * vẫn chấm all-or-nothing như cũ. Khi cho phép nhiều đáp án đúng, tính
     * theo tỉ lệ số đáp án đúng học sinh chọn được trên tổng số đáp án đúng
     * (không trừ điểm nếu tick thêm đáp án sai ngoài dự kiến).
     */
    private BigDecimal gradeMultiple(QuestionDetailDto q, JsonNode r) {
        Set<Long> correct = new HashSet<>();
        for (QuestionParts.Option o : q.options()) {
            if (o.correct()) correct.add(o.id());
        }
        if (correct.isEmpty()) return BigDecimal.ZERO;
        Set<Long> selected = new HashSet<>();
        JsonNode arr = r == null ? null : r.get("selectedOptionIds");
        if (arr != null && arr.isArray()) {
            arr.forEach(n -> selected.add(n.asLong()));
        }
        boolean singleAnswer = q.settings() != null
                && q.settings().path("singleAnswer").asBoolean(false);
        if (singleAnswer || correct.size() == 1) {
            return correct.equals(selected) ? BigDecimal.ONE : BigDecimal.ZERO;
        }
        long correctSelected = selected.stream().filter(correct::contains).count();
        BigDecimal fraction = BigDecimal.valueOf(correctSelected)
                .divide(BigDecimal.valueOf(correct.size()), 6, RoundingMode.HALF_UP);
        return fraction.min(BigDecimal.ONE);
    }

    private boolean gradeSingle(QuestionDetailDto q, JsonNode r) {
        Long correctId = q.options().stream()
                .filter(QuestionParts.Option::correct)
                .map(QuestionParts.Option::id).findFirst().orElse(null);
        Long selected = (r != null && r.has("selectedOptionId"))
                ? r.get("selectedOptionId").asLong() : null;
        return correctId != null && correctId.equals(selected);
    }

    private boolean gradeShortAnswer(QuestionDetailDto q, JsonNode r) {
        JsonNode settings = q.settings();
        if (settings == null) return false;
        boolean caseSensitive = settings.path("caseSensitive").asBoolean(false);
        String text = (r != null && r.has("text")) ? r.get("text").asString("") : "";
        text = text.trim();
        JsonNode accepted = settings.get("acceptedAnswers");
        if (accepted == null || !accepted.isArray()) return false;
        for (JsonNode a : accepted) {
            if (stringEquals(a.asString(""), text, caseSensitive)) return true;
        }
        return false;
    }

    private boolean gradeMatching(QuestionDetailDto q, JsonNode r) {
        JsonNode matches = r == null ? null : r.get("matches");
        if (matches == null || q.matchingPairs().isEmpty()) return false;
        for (QuestionParts.MatchingPair p : q.matchingPairs()) {
            String chosen = matches.path(String.valueOf(p.id())).asString("");
            if (!stringEquals(chosen, p.rightItem(), false)) return false;
        }
        return true;
    }

    /** Trả về tỉ lệ số ô trống điền đúng trên tổng số ô trống (0..1). */
    private BigDecimal gradeCloze(QuestionDetailDto q, JsonNode r) {
        JsonNode subs = r == null ? null : r.get("subs");
        if (subs == null || q.clozeSubAnswers().isEmpty()) return BigDecimal.ZERO;
        int correctCount = 0;
        for (QuestionParts.ClozeSubAnswer c : q.clozeSubAnswers()) {
            String chosen = subs.path(String.valueOf(c.subIndex())).asString("").trim();
            JsonNode accepted = c.acceptedAnswers();
            if (accepted != null && accepted.isArray()) {
                for (JsonNode a : accepted) {
                    if (stringEquals(a.asString(""), chosen, c.caseSensitive())) { correctCount++; break; }
                }
            }
        }
        return BigDecimal.valueOf(correctCount)
                .divide(BigDecimal.valueOf(q.clozeSubAnswers().size()), 6, RoundingMode.HALF_UP);
    }

    private boolean gradeDrag(QuestionDetailDto q, JsonNode r) {
        JsonNode placements = r == null ? null : r.get("placements");
        if (placements == null || q.dragItems().isEmpty()) return false;
        for (QuestionParts.DragItem d : q.dragItems()) {
            String chosen = placements.path(String.valueOf(d.id())).asString("");
            if (!stringEquals(chosen, d.correctTarget(), false)) return false;
        }
        return true;
    }

    private boolean gradeGrid(QuestionDetailDto q, JsonNode r) {
        JsonNode choices = r == null ? null : r.get("choices");
        if (choices == null || q.gridRows().isEmpty()) return false;
        for (QuestionParts.GridRow row : q.gridRows()) {
            String chosen = choices.path(String.valueOf(row.id())).asString("");
            if (!stringEquals(chosen, row.correctColumnLabel(), false)) return false;
        }
        return true;
    }

    private boolean stringEquals(String a, String b, boolean caseSensitive) {
        if (a == null) a = "";
        if (b == null) b = "";
        a = a.trim();
        b = b.trim();
        return caseSensitive ? a.equals(b) : a.equalsIgnoreCase(b);
    }
}
