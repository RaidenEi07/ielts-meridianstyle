package com.meridian.admin;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import com.meridian.rbac.PermissionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cấu hình site (key-value). Đọc branding công khai; sửa cần system:manage. */
@Service
public class ConfigService {

    /** Các khóa được phép trả ra công khai (branding). */
    private static final Set<String> PUBLIC_KEYS = Set.of(
            "SITE_NAME", "SITE_TAGLINE", "SITE_LANGUAGE", "SITE_THEME_MODE",
            "PRIMARY_COLOR", "ACCENT_COLOR", "SUPPORT_EMAIL", "REGISTRATION_OPEN",
            "HOMEPAGE_INFO_CARDS");

    private final WebConfigurationRepository repository;
    private final PermissionService permissionService;

    public ConfigService(WebConfigurationRepository repository,
            PermissionService permissionService) {
        this.repository = repository;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public Map<String, String> publicConfig() {
        Map<String, String> out = new LinkedHashMap<>();
        for (WebConfiguration c : repository.findAll()) {
            if (PUBLIC_KEYS.contains(c.getKey())) {
                out.put(c.getKey(), c.getValue());
            }
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, String> allConfig(UUID uid) {
        permissionService.requireSystemCapability(uid, "system:manage");
        Map<String, String> out = new LinkedHashMap<>();
        repository.findAll().stream()
                .sorted((a, b) -> a.getKey().compareTo(b.getKey()))
                .forEach(c -> out.put(c.getKey(), c.getValue()));
        return out;
    }

    @Transactional
    public Map<String, String> update(UUID uid, Map<String, String> updates) {
        permissionService.requireSystemCapability(uid, "system:manage");
        updates.forEach((key, value) -> {
            WebConfiguration c = repository.findById(key).orElseGet(() -> {
                WebConfiguration nc = new WebConfiguration();
                nc.setKey(key);
                return nc;
            });
            c.setValue(value);
            c.setUpdatedBy(uid);
            c.setUpdatedAt(java.time.Instant.now());
            repository.save(c);
        });
        return allConfig(uid);
    }
}
