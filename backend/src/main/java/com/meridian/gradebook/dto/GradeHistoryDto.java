package com.meridian.gradebook.dto;

import com.meridian.gradebook.GradeHistory;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record GradeHistoryDto(
        Long id, Long answerId, UUID changedBy,
        BigDecimal oldMark, BigDecimal newMark, String reason, Instant createdAt) {

    public static GradeHistoryDto from(GradeHistory h) {
        return new GradeHistoryDto(h.getId(), h.getAnswerId(), h.getChangedBy(),
                h.getOldMark(), h.getNewMark(), h.getReason(), h.getCreatedAt());
    }
}
