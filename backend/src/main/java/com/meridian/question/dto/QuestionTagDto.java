package com.meridian.question.dto;

import com.meridian.question.QuestionTag;

public record QuestionTagDto(Long id, String name) {

    public static QuestionTagDto from(QuestionTag t) {
        return new QuestionTagDto(t.getId(), t.getName());
    }
}
