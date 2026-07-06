package com.meridian.question.dto;

import com.meridian.question.Passage;

public record PassageDto(
        Long id, String title, String kind, String content, String audioUrl) {

    public static PassageDto from(Passage p) {
        return new PassageDto(p.getId(), p.getTitle(), p.getKind().name(),
                p.getContent(), p.getAudioUrl());
    }
}
