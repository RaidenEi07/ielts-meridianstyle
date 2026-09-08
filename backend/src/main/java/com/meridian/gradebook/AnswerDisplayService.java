package com.meridian.gradebook;

import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Diễn giải 1 câu trả lời thành văn bản NGƯỜI ĐỌC ĐƯỢC — đáp án đúng là gì,
 * học sinh đã trả lời gì — dùng cho màn "xem đề & đáp án" và xuất PDF "đề +
 * đáp án của học sinh". Khác {@link com.meridian.quiz.GradingService} (chỉ
 * tính đúng/sai để chấm điểm) — ở đây đọc lại ĐÚNG cấu trúc field JSON response
 * theo từng dạng câu hỏi (xem GradingService làm nguồn tham chiếu) nhưng để
 * HIỂN THỊ, không dùng để tính điểm.
 */
@Service
public class AnswerDisplayService {

    private final ObjectMapper json;

    public AnswerDisplayService(ObjectMapper json) {
        this.json = json;
    }

    public record Display(String correctAnswerText, String studentAnswerText) {
    }

    public Display describe(QuestionDetailDto q, String rawResponse) {
        JsonNode r = parse(rawResponse);
        return switch (q.type()) {
            case "MULTIPLE_CHOICE" -> describeMultiple(q, r);
            case "TRUE_FALSE_NOT_GIVEN" -> describeSingle(q, r);
            case "SHORT_ANSWER" -> describeShortAnswer(q, r);
            case "MATCHING" -> describeMatching(q, r);
            case "CLOZE" -> describeCloze(q, r);
            case "DRAG_DROP_TEXT", "DRAG_DROP_MARKER" -> describeDrag(q, r);
            case "GRID_MATCHING" -> describeGrid(q, r);
            case "ESSAY" -> describeEssay(r);
            default -> new Display(null, null);
        };
    }

    private Display describeMultiple(QuestionDetailDto q, JsonNode r) {
        String correct = q.options().stream().filter(QuestionParts.Option::correct)
                .map(o -> stripHtml(o.content())).collect(Collectors.joining("; "));
        Set<Long> selected = new HashSet<>();
        JsonNode arr = r == null ? null : r.get("selectedOptionIds");
        if (arr != null && arr.isArray()) {
            arr.forEach(n -> selected.add(n.asLong()));
        }
        String student = q.options().stream().filter(o -> selected.contains(o.id()))
                .map(o -> stripHtml(o.content())).collect(Collectors.joining("; "));
        return new Display(nullIfBlank(correct), nullIfBlank(student));
    }

    private Display describeSingle(QuestionDetailDto q, JsonNode r) {
        String correct = q.options().stream().filter(QuestionParts.Option::correct)
                .map(o -> stripHtml(o.content())).findFirst().orElse(null);
        Long selectedId = (r != null && r.has("selectedOptionId")) ? r.get("selectedOptionId").asLong() : null;
        String student = selectedId == null ? null : q.options().stream()
                .filter(o -> selectedId.equals(o.id()))
                .map(o -> stripHtml(o.content())).findFirst().orElse(null);
        return new Display(nullIfBlank(correct), nullIfBlank(student));
    }

    private Display describeShortAnswer(QuestionDetailDto q, JsonNode r) {
        JsonNode settings = q.settings();
        String correct = null;
        if (settings != null) {
            JsonNode accepted = settings.get("acceptedAnswers");
            if (accepted != null && accepted.isArray()) {
                List<String> vals = new ArrayList<>();
                accepted.forEach(a -> vals.add(a.asString("")));
                correct = String.join(" / ", vals);
            }
        }
        String student = (r != null && r.has("text")) ? r.get("text").asString("") : null;
        return new Display(nullIfBlank(correct), nullIfBlank(student));
    }

    private Display describeMatching(QuestionDetailDto q, JsonNode r) {
        JsonNode matches = r == null ? null : r.get("matches");
        StringBuilder correct = new StringBuilder();
        StringBuilder student = new StringBuilder();
        for (QuestionParts.MatchingPair p : q.matchingPairs()) {
            String chosen = matches == null ? "" : matches.path(String.valueOf(p.id())).asString("");
            appendLine(correct, p.leftItem() + " → " + orNotConfigured(p.rightItem()));
            appendLine(student, p.leftItem() + " → " + (chosen.isBlank() ? "(bỏ trống)" : chosen));
        }
        return new Display(nullIfBlank(correct.toString()), nullIfBlank(student.toString()));
    }

    private Display describeCloze(QuestionDetailDto q, JsonNode r) {
        JsonNode subs = r == null ? null : r.get("subs");
        StringBuilder correct = new StringBuilder();
        StringBuilder student = new StringBuilder();
        int i = 0;
        for (QuestionParts.ClozeSubAnswer c : q.clozeSubAnswers()) {
            i++;
            String chosen = subs == null ? "" : subs.path(String.valueOf(c.subIndex())).asString("").trim();
            List<String> accepted = new ArrayList<>();
            if (c.acceptedAnswers() != null && c.acceptedAnswers().isArray()) {
                c.acceptedAnswers().forEach(a -> accepted.add(a.asString("")));
            }
            appendLine(correct, "Ô " + i + ": " + String.join(" / ", accepted));
            appendLine(student, "Ô " + i + ": " + (chosen.isBlank() ? "(bỏ trống)" : chosen));
        }
        return new Display(nullIfBlank(correct.toString()), nullIfBlank(student.toString()));
    }

    private Display describeDrag(QuestionDetailDto q, JsonNode r) {
        JsonNode placements = r == null ? null : r.get("placements");
        StringBuilder correct = new StringBuilder();
        StringBuilder student = new StringBuilder();
        for (QuestionParts.DragItem d : q.dragItems()) {
            String chosen = placements == null ? "" : placements.path(String.valueOf(d.id())).asString("");
            String label = stripHtml(d.content());
            appendLine(correct, label + " → " + orNotConfigured(d.correctTarget()));
            appendLine(student, label + " → " + (chosen.isBlank() ? "(bỏ trống)" : chosen));
        }
        return new Display(nullIfBlank(correct.toString()), nullIfBlank(student.toString()));
    }

    private Display describeGrid(QuestionDetailDto q, JsonNode r) {
        JsonNode choices = r == null ? null : r.get("choices");
        StringBuilder correct = new StringBuilder();
        StringBuilder student = new StringBuilder();
        for (QuestionParts.GridRow row : q.gridRows()) {
            String chosen = choices == null ? "" : choices.path(String.valueOf(row.id())).asString("");
            appendLine(correct, row.rowText() + " → " + orNotConfigured(row.correctColumnLabel()));
            appendLine(student, row.rowText() + " → " + (chosen.isBlank() ? "(bỏ trống)" : chosen));
        }
        return new Display(nullIfBlank(correct.toString()), nullIfBlank(student.toString()));
    }

    /** Essay chấm tay — không có đáp án đúng cố định. */
    private Display describeEssay(JsonNode r) {
        String text = (r != null && r.has("text")) ? r.get("text").asString("") : null;
        return new Display(null, nullIfBlank(text));
    }

    private void appendLine(StringBuilder sb, String line) {
        if (sb.length() > 0) {
            sb.append('\n');
        }
        sb.append(line);
    }

    private String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    /** Một số câu Kéo thả/Ghép nối/Lưới cũ có phần tử KHÔNG khai báo đáp án
     * đúng (correctTarget/rightItem/correctColumnLabel rỗng) — GradingService
     * chấm phần tử đó "đúng" một cách trùng hợp khi học sinh cũng bỏ trống
     * (chuỗi rỗng so bằng chuỗi rỗng). Hiện rõ ràng thay vì để trống sau "→"
     * trông như lỗi hiển thị. */
    private String orNotConfigured(String s) {
        return (s == null || s.isBlank()) ? "(chưa cấu hình đáp án đúng)" : s;
    }

    private String stripHtml(String s) {
        return s == null ? "" : s.replaceAll("<[^>]+>", "").trim();
    }

    private JsonNode parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return json.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }
}
