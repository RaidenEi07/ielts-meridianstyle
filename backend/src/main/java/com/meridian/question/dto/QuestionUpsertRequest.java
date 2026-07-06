package com.meridian.question.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import tools.jackson.databind.JsonNode;

/**
 * Tạo/sửa câu hỏi cho mọi loại. Trường con (options, matchingPairs...) chỉ cần
 * điền theo loại tương ứng; service sẽ validate và bỏ qua phần không liên quan.
 */
public record QuestionUpsertRequest(
        @NotNull(message = "categoryId là bắt buộc") Long categoryId,
        @NotBlank(message = "type là bắt buộc") String type,
        @NotBlank(message = "name là bắt buộc") String name,
        String stem,
        Long passageId,
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
