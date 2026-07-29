package com.meridian.recommendation.dto;

import com.meridian.catalog.dto.CourseSummaryDto;
import java.math.BigDecimal;
import java.util.List;

/**
 * Gợi ý khóa học bản đơn giản (v1) — dựa trên nhóm đối tượng (audienceGroup)
 * của các khóa đã ghi danh/đã làm bài, chưa phân tích chi tiết theo kỹ năng.
 */
public record RecommendedCoursesDto(
        List<CourseSummaryDto> courses,
        BigDecimal averageBandScore,
        String note) {
}
