package com.meridian.distribution;

import com.meridian.distribution.dto.CourseDistributionDtos.DistributeCourseRequest;
import com.meridian.distribution.dto.CourseDistributionDtos.DistributeResultDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/catalog/courses/{courseId}")
public class CourseDistributionController {

    private final CourseDistributionService service;
    private final CurrentUserProvider currentUser;

    public CourseDistributionController(CourseDistributionService service, CurrentUserProvider currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @PostMapping("/distribute")
    public List<DistributeResultDto> distribute(@PathVariable Long courseId,
            @RequestBody DistributeCourseRequest req) {
        return service.distribute(uid(), courseId, req.childSiteIds());
    }
}
