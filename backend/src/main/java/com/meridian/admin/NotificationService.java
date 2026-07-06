package com.meridian.admin;

import com.meridian.admin.dto.AdminDtos.BroadcastRequest;
import com.meridian.admin.dto.AdminDtos.NotificationDto;
import com.meridian.common.ApiException;
import com.meridian.rbac.PermissionService;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository repository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public NotificationService(NotificationRepository repository,
            UserRepository userRepository, PermissionService permissionService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> myList(UUID uid) {
        return repository.findByUserIdOrderByCreatedAtDesc(uid).stream()
                .map(NotificationDto::from).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID uid) {
        return repository.countByUserIdAndReadAtIsNull(uid);
    }

    @Transactional
    public void markRead(UUID uid, Long id) {
        Notification n = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thông báo"));
        if (!n.getUserId().equals(uid)) {
            throw ApiException.forbidden("Không phải thông báo của bạn");
        }
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            repository.save(n);
        }
    }

    @Transactional
    public void markAllRead(UUID uid) {
        Instant now = Instant.now();
        List<Notification> unread = repository.findByUserIdAndReadAtIsNull(uid);
        unread.forEach(n -> n.setReadAt(now));
        repository.saveAll(unread);
    }

    /** Gửi thông báo tới tất cả người dùng (system:manage). */
    @Transactional
    public int broadcast(UUID uid, BroadcastRequest req) {
        permissionService.requireSystemCapability(uid, "system:manage");
        List<User> users = userRepository.findAll();
        for (User u : users) {
            Notification n = new Notification();
            n.setUserId(u.getId());
            n.setTitle(req.title());
            n.setBody(req.body());
            n.setLink(req.link());
            repository.save(n);
        }
        return users.size();
    }
}
