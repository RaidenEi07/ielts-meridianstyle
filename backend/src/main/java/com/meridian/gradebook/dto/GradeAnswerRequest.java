package com.meridian.gradebook.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record GradeAnswerRequest(
        @NotNull(message = "awardedMark là bắt buộc") BigDecimal awardedMark,
        String reason) {
}
