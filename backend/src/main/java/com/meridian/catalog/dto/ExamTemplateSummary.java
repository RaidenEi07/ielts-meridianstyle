package com.meridian.catalog.dto;

import com.meridian.catalog.ExamTemplate;

public record ExamTemplateSummary(Long id, String code, String name) {

    public static ExamTemplateSummary from(ExamTemplate t) {
        return t == null ? null : new ExamTemplateSummary(t.getId(), t.getCode(), t.getName());
    }
}
