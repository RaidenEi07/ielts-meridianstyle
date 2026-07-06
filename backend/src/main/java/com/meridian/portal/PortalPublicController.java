package com.meridian.portal;

import com.meridian.portal.dto.PortalDtos.InquiryDto;
import com.meridian.portal.dto.PortalDtos.InquiryRequest;
import com.meridian.portal.dto.PortalDtos.PublicStatsDto;
import com.meridian.portal.dto.PortalDtos.TeacherPublicDto;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Endpoint công khai cho trang chủ. */
@RestController
public class PortalPublicController {

    private final PortalService portalService;

    public PortalPublicController(PortalService portalService) {
        this.portalService = portalService;
    }

    @GetMapping("/api/catalog/teachers")
    public List<TeacherPublicDto> teachers() {
        return portalService.featuredTeachers();
    }

    @GetMapping("/api/catalog/stats")
    public PublicStatsDto stats() {
        return portalService.publicStats();
    }

    @PostMapping("/api/inquiries")
    public ResponseEntity<InquiryDto> submit(@Valid @RequestBody InquiryRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(portalService.createInquiry(req));
    }
}
