package com.meridian.admin;

import com.meridian.admin.dto.AdminDtos.BroadcastRequest;
import com.meridian.admin.dto.AdminDtos.NotificationDto;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NotificationController {

    private final NotificationService service;
    private final CurrentUserProvider currentUser;

    public NotificationController(NotificationService service, CurrentUserProvider currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping("/api/notifications/me")
    public List<NotificationDto> myNotifications() {
        return service.myList(uid());
    }

    @GetMapping("/api/notifications/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", service.unreadCount(uid()));
    }

    @PostMapping("/api/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        service.markRead(uid(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/notifications/read-all")
    public ResponseEntity<Void> markAllRead() {
        service.markAllRead(uid());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/admin/notifications/broadcast")
    public Map<String, Integer> broadcast(@Valid @RequestBody BroadcastRequest req) {
        return Map.of("recipients", service.broadcast(uid(), req));
    }
}
