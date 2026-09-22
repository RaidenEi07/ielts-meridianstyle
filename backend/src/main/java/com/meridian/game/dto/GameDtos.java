package com.meridian.game.dto;

import java.util.List;

/** DTO cho game hóa (Phase 19; V51 thêm khái niệm "lượt chơi" server-side). */
public final class GameDtos {

    private GameDtos() {
    }

    public record MemoryPairDto(Long pairId, String word, String imageUrl) {
    }

    /** Lượt Lật thẻ vừa bắt đầu — roundId dùng để gọi finishRound() lúc
     * hoàn thành, không còn cách nào tự báo điểm mà không có 1 lượt thật. */
    public record StartMemoryRoundDto(Long roundId, List<MemoryPairDto> pairs) {
    }

    public record LeaderboardEntryDto(String fullName, long totalPoints) {
    }

    public record RaceOptionDto(Long id, String content) {
    }

    public record RaceQuestionDto(Long questionId, String stem, List<RaceOptionDto> options) {
    }

    /** Lượt Đua trả lời nhanh vừa bắt đầu — cùng ý nghĩa roundId như trên. */
    public record StartRaceRoundDto(Long roundId, List<RaceQuestionDto> questions) {
    }

    /** roundId bắt buộc từ V51 — checkRaceAnswer() cần biết chấm cho đúng
     * lượt nào để cộng dồn correctCount vào đúng chỗ. */
    public record CheckAnswerRequest(Long roundId, Long questionId, Long selectedOptionId) {
    }

    public record CheckAnswerResult(boolean correct) {
    }

    /** Thay AwardPointsRequest cũ (V51) — KHÔNG còn trường "points": điểm
     * giờ do server tự tính từ chính lượt chơi (roundId ở path), "reason"
     * chỉ là dòng mô tả hiển thị, không ảnh hưởng điểm/huy hiệu. */
    public record FinishRoundRequest(String reason) {
    }

    public record BadgeDto(String code, String name, String description, String emoji, boolean earned) {
    }

    /** Kết quả kết thúc 1 lượt chơi — trả kèm điểm THẬT server vừa tính (để
     * giao diện hiện đúng số, vì client không còn tự quyết định số này nữa). */
    public record FinishRoundResult(int pointsEarned, List<BadgeDto> badges) {
    }
}
