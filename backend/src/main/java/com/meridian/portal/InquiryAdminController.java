package com.meridian.portal;

import com.meridian.portal.dto.PortalDtos.InquiryDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/inquiries")
public class InquiryAdminController {

    private final PortalService portalService;
    private final CurrentUserProvider currentUser;

    public InquiryAdminController(PortalService portalService,
            CurrentUserProvider currentUser) {
        this.portalService = portalService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<InquiryDto> list() {
        return portalService.listInquiries(currentUser.require().id());
    }

    @PatchMapping("/{id}/status")
    public InquiryDto updateStatus(@PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return portalService.updateInquiryStatus(
                currentUser.require().id(), id, body.getOrDefault("status", "NEW"));
    }
}
