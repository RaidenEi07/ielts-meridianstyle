package com.meridian.checkpoint.dto;

import java.math.BigDecimal;

/** answered chỉ có ý nghĩa ở luồng học viên (GET) — luôn false khi admin soạn checkpoint. */
public record VideoCheckpointDto(
        Long id,
        Long sectionId,
        BigDecimal timestampSec,
        Long questionId,
        int sortOrder,
        boolean answered) {
}
