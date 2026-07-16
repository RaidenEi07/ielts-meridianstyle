package com.meridian.dubbing.dto;

import java.math.BigDecimal;
import java.util.List;

/** DTO cho lồng tiếng nhân vật (Phase 16). */
public final class DubbingDtos {

    private DubbingDtos() {
    }

    public record SegmentDto(Long id, BigDecimal startSeconds, BigDecimal endSeconds) {
    }

    public record CharacterDto(Long id, String name, List<SegmentDto> segments) {
    }

    public record RecordingDto(Long id, Long segmentId, String audioUrl) {
    }
}
