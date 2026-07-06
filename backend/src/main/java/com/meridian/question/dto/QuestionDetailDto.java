package com.meridian.question.dto;

import java.math.BigDecimal;
import java.util.List;
import tools.jackson.databind.JsonNode;

public record QuestionDetailDto(
        Long id,
        String type,
        String name,
        String stem,
        Long categoryId,
        String categoryName,
        Long passageId,
        String passageTitle,
        String passageContent,
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
