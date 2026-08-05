package com.meridian.question;

import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;

/**
 * Định dạng đáp án đúng thành text dễ đọc cho màn "Kết quả bài làm" SAU KHI đã
 * nộp bài — chỉ gọi từ {@code AttemptService.buildResult()}, nơi câu hỏi được
 * nạp qua {@code QuestionDetailDto} (bản đầy đủ có đáp án đúng, khác hẳn bản
 * "player-safe" dùng lúc đang làm bài) nên không lộ đáp án trước khi nộp.
 * ESSAY không có khái niệm "đáp án đúng" cố định (chấm tay) — trả về rỗng.
 */
public final class CorrectAnswerFormatter {

    private static final Pattern DRAG_TEXT_LABEL = Pattern.compile("\\[\\[(\\d+)]]");

    private CorrectAnswerFormatter() {
    }

    /**
     * @param startNumber Số thứ tự "Câu N" thật (khớp màn làm bài) của Ô TRỐNG
     *                     ĐẦU TIÊN trong câu hỏi này — chỉ CLOZE dùng tới, để
     *                     hiện "Câu 9" thay vì đánh số nội bộ "Ô 1" (lệch hẳn
     *                     với số hiện trên màn hình khi câu hỏi không bắt đầu
     *                     từ Câu 1, vd Cloze 8 ô nằm ở Câu 6-13 của bài).
     */
    public static List<String> format(QuestionDetailDto q, int startNumber) {
        return switch (q.type()) {
            case "MULTIPLE_CHOICE", "TRUE_FALSE_NOT_GIVEN" -> formatOptions(q);
            case "MATCHING" -> formatMatching(q);
            case "CLOZE" -> formatCloze(q, startNumber);
            case "SHORT_ANSWER" -> formatShortAnswer(q);
            case "DRAG_DROP_TEXT" -> formatDragTarget(q, "vị trí");
            case "DRAG_DROP_MARKER" -> formatDragTarget(q, "vùng");
            case "GRID_MATCHING" -> formatGrid(q);
            default -> List.of();
        };
    }

    /**
     * Số ô/vị trí/hàng riêng mà câu hỏi này chiếm trên màn làm bài — PHẢI
     * khớp chính xác {@code expandSlots()} phía frontend (quiz/[attemptId]/
     * page.tsx) vì {@code AttemptService.buildResult()} dùng số này để cộng
     * dồn, tính ra {@code startNumber} thật cho từng câu hỏi kế tiếp. ESSAY
     * trả 0 — không chiếm số "Câu N" nào (hiện riêng thành "Writing Task N",
     * không xen vào mạch đánh số đọc/nghe).
     */
    public static int slotCount(QuestionDetailDto q) {
        return switch (q.type()) {
            case "ESSAY" -> 0;
            case "CLOZE" -> Math.max(1, q.clozeSubAnswers().size());
            case "DRAG_DROP_MARKER" -> Math.max(1, q.dragZones().size());
            case "GRID_MATCHING" -> Math.max(1, q.gridRows().size());
            case "DRAG_DROP_TEXT" -> Math.max(1, dragDropTextLabelCount(q));
            case "MULTIPLE_CHOICE" ->
                    Math.max(1, (int) q.options().stream().filter(QuestionParts.Option::correct).count());
            default -> 1;
        };
    }

    private static int dragDropTextLabelCount(QuestionDetailDto q) {
        if (q.settings() == null) return 0;
        JsonNode t = q.settings().get("template");
        String template = (t != null && !t.isNull()) ? t.asString("") : "";
        Matcher m = DRAG_TEXT_LABEL.matcher(template);
        Set<String> labels = new LinkedHashSet<>();
        while (m.find()) labels.add(m.group(1));
        return labels.size();
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

    private static List<String> formatCloze(QuestionDetailDto q, int startNumber) {
        List<QuestionParts.ClozeSubAnswer> sorted = q.clozeSubAnswers().stream()
                .sorted(Comparator.comparingInt(QuestionParts.ClozeSubAnswer::subIndex))
                .toList();
        // Dùng VỊ TRÍ sau khi sắp xếp (0, 1, 2...) để cộng vào startNumber —
        // KHÔNG dùng thẳng subIndex (có thể thưa/không liền nhau tuỳ cách tác
        // giả đánh số ô lúc soạn câu hỏi).
        List<String> lines = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            QuestionParts.ClozeSubAnswer c = sorted.get(i);
            lines.add("Câu " + (startNumber + i) + ": " + String.join(" / ", jsonStrings(c.acceptedAnswers())));
        }
        return lines;
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
