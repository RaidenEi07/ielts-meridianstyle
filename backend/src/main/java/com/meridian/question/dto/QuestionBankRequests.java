package com.meridian.question.dto;

import com.meridian.question.Audience;
import jakarta.validation.constraints.NotBlank;

/** Request body cho category/tag/passage của ngân hàng câu hỏi. */
public final class QuestionBankRequests {

    private QuestionBankRequests() {
    }

    public record CreateCategory(
            @NotBlank(message = "Tên danh mục là bắt buộc") String name,
            Long parentId,
            String description,
            Audience audience) {
    }

    public record CreateTag(@NotBlank(message = "Tên tag là bắt buộc") String name) {
    }

    public record UpsertPassage(
            @NotBlank(message = "Tiêu đề passage là bắt buộc") String title,
            String kind,
            String content,
            String audioUrl) {
    }
}
