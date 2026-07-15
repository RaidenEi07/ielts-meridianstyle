package com.meridian.game.dto;

import java.util.List;

/** DTO cho game hóa (Phase 19). */
public final class GameDtos {

    private GameDtos() {
    }

    public record MemoryPairDto(Long pairId, String word, String imageUrl) {
    }

    public record LeaderboardEntryDto(String fullName, long totalPoints) {
    }

    public record AwardPointsRequest(int points, String reason, String gameMode) {
    }

    public record RaceOptionDto(Long id, String content) {
    }

    public record RaceQuestionDto(Long questionId, String stem, List<RaceOptionDto> options) {
    }

    public record CheckAnswerRequest(Long questionId, Long selectedOptionId) {
    }

    public record CheckAnswerResult(boolean correct) {
    }
}
