package com.meridian.question.dto;

import com.meridian.question.QuestionCategory;

public record QuestionCategoryDto(Long id, String name, Long parentId, String description) {

    public static QuestionCategoryDto from(QuestionCategory c) {
        return new QuestionCategoryDto(c.getId(), c.getName(),
                c.getParent() != null ? c.getParent().getId() : null,
                c.getDescription());
    }
}
