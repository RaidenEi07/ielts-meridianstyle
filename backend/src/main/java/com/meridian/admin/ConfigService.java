package com.meridian.admin;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import com.meridian.common.ApiException;
import com.meridian.rbac.PermissionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cấu hình site (key-value). Đọc branding công khai; sửa cần system:manage. */
@Service
public class ConfigService {

    /** Các khóa được phép trả ra công khai (branding). */
    private static final Set<String> PUBLIC_KEYS = Set.of(
            "SITE_NAME", "SITE_TAGLINE", "SITE_LANGUAGE", "SITE_THEME_MODE",
            "PRIMARY_COLOR", "ACCENT_COLOR", "BACKGROUND_COLOR", "SUPPORT_EMAIL", "REGISTRATION_OPEN",
            "HOMEPAGE_INFO_CARDS");

    private static final Set<String> COLOR_KEYS = Set.of("PRIMARY_COLOR", "ACCENT_COLOR", "BACKGROUND_COLOR");
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9A-Fa-f]{6}$");

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
        // Kiểm tra hết trước khi ghi để 1 mã màu sai không làm cấu hình lưu dở dang.
        Map<String, String> normalized = new LinkedHashMap<>();
        updates.forEach((key, value) ->
                normalized.put(key, COLOR_KEYS.contains(key) ? normalizeColor(key, value) : value));
        normalized.forEach((key, value) -> {
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

    private static String normalizeColor(String key, String value) {
        String trimmed = value == null ? "" : value.trim();
        if (!HEX_COLOR.matcher(trimmed).matches()) {
            throw ApiException.badRequest("Mã màu không hợp lệ cho " + key + " — cần dạng #RRGGBB");
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }
}
