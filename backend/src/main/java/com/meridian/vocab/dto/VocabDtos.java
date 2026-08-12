package com.meridian.vocab.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class VocabDtos {
    private VocabDtos() {}

    /** Danh sách bộ thẻ trong 1 section — dùng cho cả học sinh lẫn admin. */
    public record VocabSetSummaryDto(Long id, String title, int sortOrder, long cardCount) {}

    /** 1 thẻ, hiển thị cho học sinh (không có acceptedAnswer — không cần, vì
     * đáp án đúng chính là chữ hiển thị trong text, không phải câu hỏi trắc
     * nghiệm cần giấu đáp án). */
    public record VocabCardDto(Long id, String cardType, String text, String audioUrl, int sortOrder) {}

    public record VocabSetDetailDto(Long id, String title, List<VocabCardDto> cards) {}

    /** Bản ghi âm của chính học sinh xem lại. */
    public record VocabRecordingDto(Long id, Long cardId, String audioUrl, Integer starRating, Instant createdAt) {}

    /** Bản ghi âm cho giáo viên chấm — kèm tên học viên + nội dung thẻ đang chấm. */
    public record AdminVocabRecordingDto(
            Long id,
            UUID userId,
            String userFullName,
            Long cardId,
            String cardText,
            String audioUrl,
            Integer starRating,
            Instant createdAt) {}

    /** 1 thẻ khi tạo/import 1 bộ mới. */
    public record CardInput(String cardType, String text, String acceptedAnswer, String audioUrl) {}

    public record CreateVocabSetRequest(String title, List<CardInput> cards) {}
}
