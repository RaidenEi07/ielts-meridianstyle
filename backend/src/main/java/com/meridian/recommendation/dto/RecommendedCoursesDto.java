package com.meridian.recommendation.dto;

import com.meridian.catalog.dto.CourseSummaryDto;
import com.meridian.gradebook.dto.ReportDtos.SkillBreakdown;
import java.math.BigDecimal;
import java.util.List;

/**
 * Gợi ý khóa học (v2) — vẫn chọn khóa theo nhóm đối tượng (audienceGroup) như
 * v1 (chưa có khóa nào tách riêng theo kỹ năng để xếp hạng khác đi), nhưng
 * giờ có phân tích thật theo kỹ năng IELTS (Nghe/Đọc/Viết) từ lịch sử bài làm
 * đã chấm — {@code weakestSkill}/{@code skillBreakdown} — để lời khuyên cụ
 * thể hơn thay vì chỉ dựa vào band điểm trung bình.
 */
public record RecommendedCoursesDto(
        List<CourseSummaryDto> courses,
        BigDecimal averageBandScore,
        String note,
        List<SkillBreakdown> skillBreakdown,
        String weakestSkill) {
}
