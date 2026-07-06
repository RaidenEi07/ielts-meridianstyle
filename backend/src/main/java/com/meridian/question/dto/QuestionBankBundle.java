package com.meridian.question.dto;

import java.math.BigDecimal;
import java.util.List;
import tools.jackson.databind.JsonNode;

/** Định dạng gói xuất/nhập ngân hàng câu hỏi theo danh mục (xem manifest.json trong file .zip). */
public final class QuestionBankBundle {

    private QuestionBankBundle() {
    }

    public static final int FORMAT_VERSION = 1;

    public record Manifest(
            int formatVersion,
            CategoryBundle category,
            List<PassageBundle> passages,
            List<QuestionBundle> questions) {
    }

    public record CategoryBundle(String name, String description) {
    }

    /** {@code refId} là khóa cục bộ trong file (không phải id thật), dùng để nhiều câu hỏi dùng chung 1 passage. */
    public record PassageBundle(
            String refId, String title, String kind, String content, String audioUrl) {
    }

    public record QuestionBundle(
            String type,
            String name,
            String stem,
            String passageRef,
            Integer answerParagraphIndex,
            String explanation,
            BigDecimal defaultMark,
            JsonNode settings,
            List<String> tags,
            List<QuestionParts.Option> options,
            List<QuestionParts.MatchingPair> matchingPairs,
            List<QuestionParts.DragItem> dragItems,
            List<QuestionParts.DragZone> dragZones,
            List<QuestionParts.ClozeSubAnswer> clozeSubAnswers) {
    }
}
