package com.meridian.game.dto;

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
}
