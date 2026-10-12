package com.meridian.config;

import com.meridian.common.ApiException;
import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * BCrypt chỉ dùng 72 byte đầu của mật khẩu; Spring Security 6.4+ không còn cắt âm thầm mà ném
 * {@link IllegalArgumentException} — thành lỗi 500 với mật khẩu có dấu tiếng Việt dài (mỗi chữ có dấu chiếm 2–3
 * byte nên 37 ký tự đã quá 72 byte). Bọc lại để: đặt/đổi mật khẩu quá dài → 400 có thông báo rõ; đăng nhập bằng
 * chuỗi quá dài → đơn giản là không khớp (không thể là mật khẩu đã lưu), không lỗi.
 */
public class LengthSafeBCryptPasswordEncoder extends BCryptPasswordEncoder {

    static final int MAX_BYTES = 72;

    private static boolean tooLong(String raw) {
        return raw.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES;
    }

    // AbstractValidatingPasswordEncoder: encode()/matches() là final; null/rỗng đã được xử lý ở lớp cha.
    @Override
    protected String encodeNonNullPassword(String rawPassword) {
        if (tooLong(rawPassword)) {
            throw ApiException.badRequest(
                    "Mật khẩu quá dài (tối đa 72 byte — ký tự có dấu chiếm nhiều byte hơn ký tự thường).");
        }
        return super.encodeNonNullPassword(rawPassword);
    }

    @Override
    protected boolean matchesNonNull(String rawPassword, String encodedPassword) {
        if (tooLong(rawPassword)) {
            return false;
        }
        return super.matchesNonNull(rawPassword, encodedPassword);
    }
}
