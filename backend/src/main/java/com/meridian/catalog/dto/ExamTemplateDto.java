package com.meridian.catalog.dto;

import tools.jackson.databind.JsonNode;

public record ExamTemplateDto(
        Long id,
        String code,
        String name,
        JsonNode skillLayoutConfig,
        JsonNode timerRules,
        JsonNode bandScoreConversion) {
}
