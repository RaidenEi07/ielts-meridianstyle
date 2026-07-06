package com.meridian.admin;

import com.meridian.admin.dto.AdminDtos.AnnouncementDto;
import com.meridian.admin.dto.AdminDtos.AnnouncementRequest;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AnnouncementController {

    private final AnnouncementService service;
    private final CurrentUserProvider currentUser;

    public AnnouncementController(AnnouncementService service, CurrentUserProvider currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    /** Thông báo đang hoạt động (mọi user đã đăng nhập). */
    @GetMapping("/api/announcements")
    public List<AnnouncementDto> active() {
        currentUser.require();
        return service.listActive();
    }

    @GetMapping("/api/admin/announcements")
    public List<AnnouncementDto> adminList() {
        return service.adminList(uid());
    }

    @PostMapping("/api/admin/announcements")
    public ResponseEntity<AnnouncementDto> create(
            @Valid @RequestBody AnnouncementRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(uid(), req));
    }

    @PutMapping("/api/admin/announcements/{id}")
    public AnnouncementDto update(@PathVariable Long id,
            @RequestBody AnnouncementRequest req) {
        return service.update(uid(), id, req);
    }

    @DeleteMapping("/api/admin/announcements/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(uid(), id);
        return ResponseEntity.noContent().build();
    }
}
