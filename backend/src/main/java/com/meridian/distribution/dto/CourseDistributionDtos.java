package com.meridian.distribution.dto;

import java.util.List;

public final class CourseDistributionDtos {

    private CourseDistributionDtos() {
    }

    public record DistributeCourseRequest(List<Long> childSiteIds) {
    }

    /** {@code warnings} là danh sách cảnh báo web con trả về khi nhập (vd câu hỏi
     * bị bỏ qua vì lỗi validate) — rỗng khi web con nhập thành công không cảnh
     * báo gì, hoặc khi không lấy được (vd web con lỗi trước khi trả JSON). */
    public record DistributeResultDto(
            Long childSiteId, String childSiteName, boolean success, String message, List<String> warnings) {
    }
}
