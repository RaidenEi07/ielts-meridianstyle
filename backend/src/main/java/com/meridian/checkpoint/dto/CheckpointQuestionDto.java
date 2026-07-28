package com.meridian.checkpoint.dto;

import com.meridian.question.Audience;
import com.meridian.quiz.dto.AttemptDtos.PlayerClozeSubAnswer;
import com.meridian.quiz.dto.AttemptDtos.PlayerDragItem;
import com.meridian.quiz.dto.AttemptDtos.PlayerDragZone;
import com.meridian.quiz.dto.AttemptDtos.PlayerMatchingOption;
import com.meridian.quiz.dto.AttemptDtos.PlayerMatchingPair;
import com.meridian.quiz.dto.AttemptDtos.PlayerOption;
import java.util.List;
import tools.jackson.databind.JsonNode;

/**
 * Câu hỏi checkpoint hiển thị cho học viên — tái dùng đúng các DTO
 * "player" đã có (không kèm đáp án đúng) từ luồng làm quiz, chỉ bỏ các
 * trường gắn với 1 lượt làm quiz cụ thể (quizQuestionId/mark/pageId).
 */
public record CheckpointQuestionDto(
        Long questionId,
        String type,
        String name,
        String stem,
        JsonNode settings,
        List<PlayerOption> options,
        List<PlayerMatchingPair> matchingPairs,
        List<PlayerMatchingOption> matchingRightPool,
        List<PlayerDragItem> dragItems,
        List<PlayerDragZone> dragZones,
        List<PlayerClozeSubAnswer> clozeSubAnswers,
        Audience audience) {
}
