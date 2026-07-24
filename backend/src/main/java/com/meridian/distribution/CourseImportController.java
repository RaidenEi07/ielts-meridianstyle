package com.meridian.distribution;

import com.meridian.distribution.dto.CourseBundle;
import com.meridian.distribution.dto.CourseImportSummaryDto;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Nhận khóa học được điều phối từ web tổng — xác thực bằng API key (xem {@link CourseImportApiKeyFilter}). */
@RestController
@RequestMapping("/api/catalog")
public class CourseImportController {

    private final CourseImportService service;

    public CourseImportController(CourseImportService service) {
        this.service = service;
    }

    @PostMapping("/import")
    public CourseImportSummaryDto importCourse(@RequestBody CourseBundle.Manifest manifest) {
        return service.importCourse(manifest);
    }
}
