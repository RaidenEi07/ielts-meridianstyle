package com.meridian.question;

import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import tools.jackson.databind.JsonNode;

/**
 * Định dạng đáp án đúng thành text dễ đọc cho màn "Kết quả bài làm" SAU KHI đã
 * nộp bài — chỉ gọi từ {@code AttemptService.buildResult()}, nơi câu hỏi được
 * nạp qua {@code QuestionDetailDto} (bản đầy đủ có đáp án đúng, khác hẳn bản
 * "player-safe" dùng lúc đang làm bài) nên không lộ đáp án trước khi nộp.
 * ESSAY không có khái niệm "đáp án đúng" cố định (chấm tay) — trả về rỗng.
 */
public final class CorrectAnswerFormatter {

    private CorrectAnswerFormatter() {
    }

    public static List<String> format(QuestionDetailDto q) {
        return switch (q.type()) {
            case "MULTIPLE_CHOICE", "TRUE_FALSE_NOT_GIVEN" -> formatOptions(q);
            case "MATCHING" -> formatMatching(q);
            case "CLOZE" -> formatCloze(q);
            case "SHORT_ANSWER" -> formatShortAnswer(q);
            case "DRAG_DROP_TEXT" -> formatDragTarget(q, "vị trí");
            case "DRAG_DROP_MARKER" -> formatDragTarget(q, "vùng");
            case "GRID_MATCHING" -> formatGrid(q);
            default -> List.of();
        };
    }

    private static List<String> formatOptions(QuestionDetailDto q) {
        List<String> correct = q.options().stream()
                .filter(QuestionParts.Option::correct)
                .map(QuestionParts.Option::content)
                .toList();
        return correct.isEmpty() ? List.of() : List.of(String.join(", ", correct));
    }

    private static List<String> formatMatching(QuestionDetailDto q) {
        return q.matchingPairs().stream()
                .map(p -> p.leftItem() + " → " + p.rightItem())
                .toList();
    }

    private static List<String> formatCloze(QuestionDetailDto q) {
        return q.clozeSubAnswers().stream()
                .sorted(Comparator.comparingInt(QuestionParts.ClozeSubAnswer::subIndex))
                .map(c -> "Ô " + c.subIndex() + ": " + String.join(" / ", jsonStrings(c.acceptedAnswers())))
                .toList();
    }

    private static List<String> formatShortAnswer(QuestionDetailDto q) {
        JsonNode settings = q.settings();
        if (settings == null) return List.of();
        List<String> accepted = jsonStrings(settings.get("acceptedAnswers"));
        return accepted.isEmpty() ? List.of() : List.of(String.join(" / ", accepted));
    }

    private static List<String> formatDragTarget(QuestionDetailDto q, String targetLabel) {
        return q.dragItems().stream()
                .filter(i -> i.correctTarget() != null && !i.correctTarget().isBlank())
                .map(i -> i.content() + " → " + targetLabel + " " + i.correctTarget())
                .toList();
    }

    private static List<String> formatGrid(QuestionDetailDto q) {
        return q.gridRows().stream()
                .map(r -> r.rowText() + " → " + r.correctColumnLabel())
                .toList();
    }

    private static List<String> jsonStrings(JsonNode arr) {
        if (arr == null || !arr.isArray()) return List.of();
        List<String> out = new ArrayList<>();
        for (JsonNode a : arr) out.add(a.asString(""));
        return out;
    }
}
