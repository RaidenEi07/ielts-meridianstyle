package com.meridian.admin;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import com.meridian.common.ApiException;
import com.meridian.config.MeridianProperties;
import com.meridian.rbac.PermissionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Cấu hình site (key-value). Đọc branding công khai; sửa cần system:manage. */
@Service
public class ConfigService {

    /** Các khóa được phép trả ra công khai (branding). */
    private static final Set<String> PUBLIC_KEYS = Set.of(
            "SITE_NAME", "SITE_TAGLINE", "SITE_LANGUAGE", "SITE_THEME_MODE",
            "PRIMARY_COLOR", "ACCENT_COLOR", "BACKGROUND_COLOR", "SITE_LOGO_URL", "SITE_LOGO_HIDE_NAME",
            "HOMEPAGE_HERO_IMAGE_URL", "HOMEPAGE_HIGHLIGHT_VALUE", "HOMEPAGE_HIGHLIGHT_LABEL",
            "HOMEPAGE_TEACHERS_LABEL", "HOMEPAGE_TESTIMONIALS", "SUPPORT_EMAIL", "SUPPORT_PHONE",
            "SUPPORT_ADDRESS", "REGISTRATION_OPEN", "HOMEPAGE_INFO_CARDS");

    private static final Set<String> COLOR_KEYS = Set.of("PRIMARY_COLOR", "ACCENT_COLOR", "BACKGROUND_COLOR");
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    /** Khóa chứa URL ảnh do admin tải lên: logo trung tâm và ảnh đầu trang chủ. */
    private static final Set<String> UPLOADED_IMAGE_KEYS = Set.of("SITE_LOGO_URL", "HOMEPAGE_HERO_IMAGE_URL");
    private static final String LOGO_HIDE_NAME_KEY = "SITE_LOGO_HIDE_NAME";
    /** Tên file MediaService sinh ra: UUID + đuôi, không có dấu "/" hay ký tự lạ. */
    private static final Pattern UPLOADED_FILE_NAME = Pattern.compile("^[A-Za-z0-9._-]+$");

    /**
     * Ô văn bản ngắn của nội dung trang chủ / liên hệ → số ký tự tối đa. Rỗng được phép (ẩn mục đó).
     * Frontend (lib/siteConfig.ts, HOMEPAGE_LIMITS) dùng cùng các con số cho maxLength của ô nhập.
     */
    private static final Map<String, Integer> SHORT_TEXT_LIMITS = Map.of(
            "HOMEPAGE_HIGHLIGHT_VALUE", 12,
            "HOMEPAGE_HIGHLIGHT_LABEL", 40,
            "HOMEPAGE_TEACHERS_LABEL", 40,
            "SUPPORT_PHONE", 40,
            "SUPPORT_ADDRESS", 200);

    private static final String TESTIMONIALS_KEY = "HOMEPAGE_TESTIMONIALS";
    // Giới hạn lời chứng thực (khớp lib/siteConfig.ts).
    private static final int MAX_TESTIMONIALS = 12;
    private static final int MAX_TESTIMONIAL_NAME = 80;
    private static final int MAX_TESTIMONIAL_BAND = 10;
    private static final int MAX_TESTIMONIAL_TEXT = 600;

    private final WebConfigurationRepository repository;
    private final PermissionService permissionService;
    private final MeridianProperties properties;
    private final ObjectMapper json;

    public ConfigService(WebConfigurationRepository repository,
            PermissionService permissionService, MeridianProperties properties, ObjectMapper json) {
        this.repository = repository;
        this.permissionService = permissionService;
        this.properties = properties;
        this.json = json;
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
        // Kiểm tra hết trước khi ghi để 1 giá trị sai không làm cấu hình lưu dở dang.
        Map<String, String> normalized = new LinkedHashMap<>();
        updates.forEach((key, value) -> normalized.put(key, normalize(key, value)));
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

    private String normalize(String key, String value) {
        if (COLOR_KEYS.contains(key)) {
            return normalizeColor(key, value);
        }
        if (UPLOADED_IMAGE_KEYS.contains(key)) {
            return normalizeUploadedImageUrl(key, value);
        }
        if (LOGO_HIDE_NAME_KEY.equals(key)) {
            return normalizeFlag(key, value);
        }
        if (SHORT_TEXT_LIMITS.containsKey(key)) {
            return normalizeShortText(key, value, SHORT_TEXT_LIMITS.get(key));
        }
        if (TESTIMONIALS_KEY.equals(key)) {
            return normalizeTestimonials(key, value);
        }
        return value;
    }

    private static String normalizeShortText(String key, String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.length() > maxLength) {
            throw ApiException.badRequest("Nội dung quá dài cho " + key + " — tối đa " + maxLength + " ký tự");
        }
        return trimmed;
    }

    /**
     * Lời chứng thực: mảng JSON các {name, band, text}. Chuẩn hóa (cắt khoảng trắng, bỏ trường lạ) rồi ghi lại
     * dạng gọn; rỗng hoặc [] nghĩa là không có lời nào (trang chủ ẩn cả mục). Dữ liệu này hiện thẳng trên
     * trang chủ nên chặn từ gốc: sai cấu trúc hay quá dài thì từ chối chứ không lưu dở.
     */
    private String normalizeTestimonials(String key, String value) {
        String raw = value == null ? "" : value.trim();
        if (raw.isEmpty()) {
            return "[]";
        }
        JsonNode root;
        try {
            root = json.readTree(raw);
        } catch (Exception e) {
            throw invalidTestimonials(key, "không phải JSON hợp lệ");
        }
        if (root == null || !root.isArray()) {
            throw invalidTestimonials(key, "cần là một danh sách");
        }
        if (root.size() > MAX_TESTIMONIALS) {
            throw invalidTestimonials(key, "tối đa " + MAX_TESTIMONIALS + " lời chứng thực");
        }
        List<Map<String, String>> out = new ArrayList<>();
        for (JsonNode item : root) {
            if (!item.isObject()) {
                throw invalidTestimonials(key, "mỗi lời chứng thực cần là một đối tượng {name, band, text}");
            }
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("name", testimonialField(key, item, "name", MAX_TESTIMONIAL_NAME, false));
            entry.put("band", testimonialField(key, item, "band", MAX_TESTIMONIAL_BAND, false));
            entry.put("text", testimonialField(key, item, "text", MAX_TESTIMONIAL_TEXT, true));
            out.add(entry);
        }
        return json.writeValueAsString(out);
    }

    private static String testimonialField(String key, JsonNode item, String field, int maxLength, boolean required) {
        JsonNode node = item.get(field);
        if (node != null && !node.isNull() && !node.isString()) {
            throw invalidTestimonials(key, "trường " + field + " phải là chữ");
        }
        String text = node == null || node.isNull() ? "" : node.asString("").trim();
        if (required && text.isEmpty()) {
            throw invalidTestimonials(key, "trường " + field + " không được để trống");
        }
        if (text.length() > maxLength) {
            throw invalidTestimonials(key, "trường " + field + " tối đa " + maxLength + " ký tự");
        }
        return text;
    }

    private static ApiException invalidTestimonials(String key, String reason) {
        return ApiException.badRequest("Lời chứng thực không hợp lệ cho " + key + " — " + reason);
    }

    private static String normalizeColor(String key, String value) {
        String trimmed = value == null ? "" : value.trim();
        if (!HEX_COLOR.matcher(trimmed).matches()) {
            throw ApiException.badRequest("Mã màu không hợp lệ cho " + key + " — cần dạng #RRGGBB");
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }

    /**
     * Ảnh chỉ được là ảnh đã tải lên chính hệ thống này (MediaService.storeImage) hoặc rỗng để gỡ ảnh.
     * Không nhận URL ngoài: URL này được nhúng vào mọi trang (logo còn được máy chủ web đọc khi dựng ảnh
     * chia sẻ), nên không để admin trỏ sang một máy chủ tùy ý.
     */
    private String normalizeUploadedImageUrl(String key, String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        String prefix = properties.getUploads().getPublicBaseUrl() + "/uploads/images/";
        if (!trimmed.startsWith(prefix) || !UPLOADED_FILE_NAME.matcher(trimmed.substring(prefix.length())).matches()) {
            throw ApiException.badRequest(
                    "Ảnh không hợp lệ cho " + key + " — cần là ảnh đã tải lên hệ thống");
        }
        return trimmed;
    }

    private static String normalizeFlag(String key, String value) {
        String trimmed = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (!trimmed.equals("true") && !trimmed.equals("false")) {
            throw ApiException.badRequest("Giá trị không hợp lệ cho " + key + " — cần true hoặc false");
        }
        return trimmed;
    }
}
