package com.meridian.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình ứng dụng dưới namespace `meridian.*` (xem application.yml).
 */
@ConfigurationProperties(prefix = "meridian")
public class MeridianProperties {

    private final Jwt jwt = new Jwt();
    private final Cors cors = new Cors();
    private final Uploads uploads = new Uploads();
    private final Distribution distribution = new Distribution();
    private final RateLimit rateLimit = new RateLimit();
    private final Security security = new Security();

    public Distribution getDistribution() {
        return distribution;
    }

    public RateLimit getRateLimit() {
        return rateLimit;
    }

    public Security getSecurity() {
        return security;
    }

    public Jwt getJwt() {
        return jwt;
    }

    public Cors getCors() {
        return cors;
    }

    public Uploads getUploads() {
        return uploads;
    }

    public static class Jwt {
        /** Secret HS256 — tối thiểu 32 ký tự. */
        private String secret;
        private long accessTokenTtlSeconds = 900;
        private long refreshTokenTtlSeconds = 1_209_600;
        private String issuer = "meridian";

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getAccessTokenTtlSeconds() {
            return accessTokenTtlSeconds;
        }

        public void setAccessTokenTtlSeconds(long accessTokenTtlSeconds) {
            this.accessTokenTtlSeconds = accessTokenTtlSeconds;
        }

        public long getRefreshTokenTtlSeconds() {
            return refreshTokenTtlSeconds;
        }

        public void setRefreshTokenTtlSeconds(long refreshTokenTtlSeconds) {
            this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }
    }

    public static class Distribution {
        /** Chỉ bật khi dev/test cục bộ (web con giả lập ở http://localhost:...) — tắt kiểm tra chống SSRF. */
        private boolean allowPrivateTargets = false;

        public boolean isAllowPrivateTargets() {
            return allowPrivateTargets;
        }

        public void setAllowPrivateTargets(boolean allowPrivateTargets) {
            this.allowPrivateTargets = allowPrivateTargets;
        }
    }

    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:3000");

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Uploads {
        /** Thư mục lưu file, tương đối so với working directory khi chạy backend. */
        private String dir = "uploads";
        /** Base URL công khai để dựng đường dẫn ảnh trả về cho client. */
        private String publicBaseUrl = "http://localhost:8090";

        public String getDir() {
            return dir;
        }

        public void setDir(String dir) {
            this.dir = dir;
        }

        public String getPublicBaseUrl() {
            return publicBaseUrl;
        }

        public void setPublicBaseUrl(String publicBaseUrl) {
            this.publicBaseUrl = publicBaseUrl;
        }
    }

    /**
     * Giới hạn tần suất theo IP cho các endpoint công khai dễ bị lạm dụng (xem RateLimitFilter). Cửa sổ cố định;
     * vượt ngưỡng trả 429 + Retry-After. Con số đặt rộng để một lớp học dùng chung 1 IP (mạng trường) không bị chặn.
     */
    public static class RateLimit {
        private boolean enabled = true;
        /** Gửi phiếu đăng ký tư vấn (POST /api/inquiries): tối đa mỗi giờ / IP. */
        private int inquiriesPerHour = 10;
        /** Tạo tài khoản (register, register-parent): tối đa mỗi giờ / IP. */
        private int registerPerHour = 30;
        /** Đăng nhập: tối đa mỗi 5 phút / IP (đã có khóa tạm theo từng tài khoản; đây chỉ chặn dò hàng loạt). */
        private int loginPerFiveMinutes = 200;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getInquiriesPerHour() {
            return inquiriesPerHour;
        }

        public void setInquiriesPerHour(int inquiriesPerHour) {
            this.inquiriesPerHour = inquiriesPerHour;
        }

        public int getRegisterPerHour() {
            return registerPerHour;
        }

        public void setRegisterPerHour(int registerPerHour) {
            this.registerPerHour = registerPerHour;
        }

        public int getLoginPerFiveMinutes() {
            return loginPerFiveMinutes;
        }

        public void setLoginPerFiveMinutes(int loginPerFiveMinutes) {
            this.loginPerFiveMinutes = loginPerFiveMinutes;
        }
    }

    public static class Security {
        /**
         * Luôn gửi Strict-Transport-Security. Mặc định chỉ gửi khi request đến qua HTTPS (trực tiếp hoặc
         * X-Forwarded-Proto: https từ reverse proxy); bật cờ này khi proxy không chuyển tiếp header đó.
         */
        private boolean forceHsts = false;

        public boolean isForceHsts() {
            return forceHsts;
        }

        public void setForceHsts(boolean forceHsts) {
            this.forceHsts = forceHsts;
        }
    }
}
