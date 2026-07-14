package com.meridian.question.dto;

import tools.jackson.databind.JsonNode;

/** Gom các DTO cấu phần con của câu hỏi (dùng cho cả request và response). */
public final class QuestionParts {

    private QuestionParts() {
    }

    /** Multiple Choice / True-False-Not Given. */
    public record Option(
            Long id, String content, boolean correct, String feedback, int sortOrder) {
    }

    /** Matching. */
    public record MatchingPair(
            Long id, String leftItem, String rightItem, int sortOrder,
            String leftImageUrl, String rightImageUrl) {
    }

    /** Drag & drop (text/marker): target = số placeholder hoặc nhãn zone. */
    public record DragItem(
            Long id, String content, String correctTarget, int sortOrder) {
    }

    /** Drag & drop markers: vùng thả trên ảnh. */
    public record DragZone(
            Long id, String label, int x, int y, int width, int height, int sortOrder) {
    }

    /** Cloze: một ô trả lời. */
    public record ClozeSubAnswer(
            Long id,
            int subIndex,
            String subType,
            JsonNode acceptedAnswers,
            JsonNode options,
            int sortOrder) {
    }
}
