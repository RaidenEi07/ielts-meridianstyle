package com.meridian.distribution.dto;

import java.util.List;

public final class CourseDistributionDtos {

    private CourseDistributionDtos() {
    }

    public record DistributeCourseRequest(List<Long> childSiteIds) {
    }

    public record DistributeResultDto(Long childSiteId, String childSiteName, boolean success, String message) {
    }
}
