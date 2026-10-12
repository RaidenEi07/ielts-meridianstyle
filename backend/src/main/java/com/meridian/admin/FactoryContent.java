package com.meridian.admin;

import java.util.Map;
import java.util.Set;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Nội dung mẫu mà các migration cài sẵn vào mọi deployment (V8, V11, V55). Với web tổng đó là nội dung của chính
 * nó; với web con thì đó là nội dung của web tổng (email, địa chỉ, số liệu, lời chứng thực) và không được hiện công
 * khai như thể là của trung tâm này.
 */
final class FactoryContent {

    private FactoryContent() {
    }

    private static final Map<String, String> TEXT = Map.of(
            "SUPPORT_EMAIL", "lienhe@meridian.edu.vn",
            "SUPPORT_ADDRESS", "Hà Nội · TP.HCM",
            "HOMEPAGE_HIGHLIGHT_VALUE", "92%",
            "HOMEPAGE_HIGHLIGHT_LABEL", "Đạt mục tiêu",
            "HOMEPAGE_TEACHERS_LABEL", "Giáo viên IELTS 8.0+");

    private static final String TESTIMONIALS_KEY = "HOMEPAGE_TESTIMONIALS";

    /** Nội dung 3 lời chứng thực mẫu (V55). Chỉ so theo nội dung: tên/band có thể bị admin sửa lẻ. */
    private static final Set<String> TESTIMONIAL_TEXTS = Set.of(
            "Mô phỏng phòng thi máy giống thi thật đến từng chi tiết. Mình vào phòng thi không hề bỡ ngỡ.",
            "Giáo viên tận tâm, lộ trình rõ ràng. Từ 6.0 lên 8.0 chỉ sau một khóa học.",
            "Ngân hàng đề phong phú, chấm tự động nhanh. Biết ngay điểm yếu để cải thiện.");

    /** @return chuỗi rỗng ("[]" với lời chứng thực) nếu {@code value} đúng là nội dung mẫu; ngược lại giữ nguyên. */
    static String withoutSample(String key, String value, ObjectMapper json) {
        if (value == null) {
            return null;
        }
        if (TESTIMONIALS_KEY.equals(key)) {
            return isSampleTestimonials(value, json) ? "[]" : value;
        }
        String sample = TEXT.get(key);
        return sample != null && sample.equals(value.trim()) ? "" : value;
    }

    /** Danh sách không rỗng mà MỌI lời chứng thực đều là một trong 3 lời mẫu (xóa bớt vẫn là người không có thật). */
    private static boolean isSampleTestimonials(String value, ObjectMapper json) {
        try {
            JsonNode root = json.readTree(value);
            if (root == null || !root.isArray() || root.isEmpty()) {
                return false;
            }
            for (JsonNode item : root) {
                JsonNode text = item.get("text");
                if (text == null || !text.isString() || !TESTIMONIAL_TEXTS.contains(text.asString("").trim())) {
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
