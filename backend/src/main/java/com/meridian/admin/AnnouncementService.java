package com.meridian.admin;

import com.meridian.admin.dto.AdminDtos.AnnouncementDto;
import com.meridian.admin.dto.AdminDtos.AnnouncementRequest;
import com.meridian.common.ApiException;
import com.meridian.rbac.PermissionService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnouncementService {

    private final SystemAnnouncementRepository repository;
    private final PermissionService permissionService;

    public AnnouncementService(SystemAnnouncementRepository repository,
            PermissionService permissionService) {
        this.repository = repository;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public List<AnnouncementDto> listActive() {
        return repository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(AnnouncementDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<AnnouncementDto> adminList(UUID uid) {
        permissionService.requireSystemCapability(uid, "system:manage");
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(AnnouncementDto::from).toList();
    }

    @Transactional
    public AnnouncementDto create(UUID uid, AnnouncementRequest req) {
        permissionService.requireSystemCapability(uid, "system:manage");
        SystemAnnouncement a = new SystemAnnouncement();
        apply(a, req);
        a.setCreatedBy(uid);
        return AnnouncementDto.from(repository.save(a));
    }

    @Transactional
    public AnnouncementDto update(UUID uid, Long id, AnnouncementRequest req) {
        permissionService.requireSystemCapability(uid, "system:manage");
        SystemAnnouncement a = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thông báo"));
        apply(a, req);
        return AnnouncementDto.from(repository.save(a));
    }

    @Transactional
    public void delete(UUID uid, Long id) {
        permissionService.requireSystemCapability(uid, "system:manage");
        repository.deleteById(id);
    }

    private void apply(SystemAnnouncement a, AnnouncementRequest req) {
        if (req.title() != null && !req.title().isBlank()) {
            a.setTitle(req.title());
        }
        a.setBody(req.body());
        if (req.active() != null) {
            a.setActive(req.active());
        }
        if (req.level() != null && !req.level().isBlank()) {
            try {
                a.setLevel(AnnouncementLevel.valueOf(req.level().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("Mức độ không hợp lệ: " + req.level());
            }
        }
    }
}
