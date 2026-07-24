package com.meridian.distribution;

import com.meridian.common.ApiException;
import com.meridian.distribution.dto.ChildSiteDtos.ChildSiteDto;
import com.meridian.distribution.dto.ChildSiteDtos.CreateChildSite;
import com.meridian.distribution.dto.ChildSiteDtos.UpdateChildSite;
import com.meridian.rbac.PermissionService;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sổ quản lý web con — chỉ web tổng dùng, gate bằng course:distribute. */
@Service
public class ChildSiteService {

    private static final String CAP = "course:distribute";
    private final ChildSiteRepository repository;
    private final PermissionService permissionService;
    private final SecureRandom random = new SecureRandom();

    public ChildSiteService(ChildSiteRepository repository, PermissionService permissionService) {
        this.repository = repository;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public List<ChildSiteDto> list(UUID uid) {
        permissionService.requireSystemCapability(uid, CAP);
        return repository.findAllByOrderByNameAsc().stream().map(ChildSiteDto::from).toList();
    }

    @Transactional
    public ChildSiteDto create(UUID uid, CreateChildSite req) {
        permissionService.requireSystemCapability(uid, CAP);
        ChildSite c = new ChildSite();
        c.setName(req.name());
        c.setBaseUrl(req.baseUrl());
        c.setApiKey(generateApiKey());
        return ChildSiteDto.from(repository.save(c));
    }

    @Transactional
    public ChildSiteDto update(UUID uid, Long id, UpdateChildSite req) {
        permissionService.requireSystemCapability(uid, CAP);
        ChildSite c = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy web con"));
        if (req.name() != null && !req.name().isBlank()) {
            c.setName(req.name());
        }
        if (req.baseUrl() != null && !req.baseUrl().isBlank()) {
            c.setBaseUrl(req.baseUrl());
        }
        if (req.active() != null) {
            c.setActive(req.active());
        }
        return ChildSiteDto.from(repository.save(c));
    }

    @Transactional
    public void delete(UUID uid, Long id) {
        permissionService.requireSystemCapability(uid, CAP);
        repository.deleteById(id);
    }

    private String generateApiKey() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
