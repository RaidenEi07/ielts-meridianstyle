package com.meridian.quiz;

import com.meridian.question.QuestionService;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import java.util.HashSet;
import java.util.Set;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

/**
 * Tự chấm câu hỏi khách quan (all-or-nothing). Essay không tự chấm.
 * Đáp án đúng lấy từ QuestionService (chi tiết câu hỏi trong ngân hàng).
 */
@Service
public class GradingService {

    private final QuestionService questionService;

    public GradingService(QuestionService questionService) {
        this.questionService = questionService;
    }

    /** correct = null nghĩa là cần chấm tay (Essay). */
    public record GradeResult(Boolean correct, boolean autoGraded) {
        static GradeResult manual() {
            return new GradeResult(null, false);
        }

        static GradeResult of(boolean ok) {
            return new GradeResult(ok, true);
        }
    }

    public GradeResult grade(Long questionId, JsonNode response) {
        QuestionDetailDto q = questionService.getQuestion(questionId);
        return switch (q.type()) {
            case "MULTIPLE_CHOICE" -> GradeResult.of(gradeMultiple(q, response));
            case "TRUE_FALSE_NOT_GIVEN" -> GradeResult.of(gradeSingle(q, response));
            case "SHORT_ANSWER" -> GradeResult.of(gradeShortAnswer(q, response));
            case "MATCHING" -> GradeResult.of(gradeMatching(q, response));
            case "CLOZE" -> GradeResult.of(gradeCloze(q, response));
            case "DRAG_DROP_TEXT", "DRAG_DROP_MARKER" -> GradeResult.of(gradeDrag(q, response));
            case "ESSAY" -> GradeResult.manual();
            default -> GradeResult.manual();
        };
    }

    private boolean gradeMultiple(QuestionDetailDto q, JsonNode r) {
        Set<Long> correct = new HashSet<>();
        for (QuestionParts.Option o : q.options()) {
            if (o.correct()) correct.add(o.id());
        }
        Set<Long> selected = new HashSet<>();
        JsonNode arr = r == null ? null : r.get("selectedOptionIds");
        if (arr != null && arr.isArray()) {
            arr.forEach(n -> selected.add(n.asLong()));
        }
        return !correct.isEmpty() && correct.equals(selected);
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

    private boolean gradeCloze(QuestionDetailDto q, JsonNode r) {
        JsonNode subs = r == null ? null : r.get("subs");
        if (subs == null || q.clozeSubAnswers().isEmpty()) return false;
        for (QuestionParts.ClozeSubAnswer c : q.clozeSubAnswers()) {
            String chosen = subs.path(String.valueOf(c.subIndex())).asString("").trim();
            boolean ok = false;
            JsonNode accepted = c.acceptedAnswers();
            if (accepted != null && accepted.isArray()) {
                for (JsonNode a : accepted) {
                    if (stringEquals(a.asString(""), chosen, false)) { ok = true; break; }
                }
            }
            if (!ok) return false;
        }
        return true;
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

    private boolean stringEquals(String a, String b, boolean caseSensitive) {
        if (a == null) a = "";
        if (b == null) b = "";
        a = a.trim();
        b = b.trim();
        return caseSensitive ? a.equals(b) : a.equalsIgnoreCase(b);
    }
}
