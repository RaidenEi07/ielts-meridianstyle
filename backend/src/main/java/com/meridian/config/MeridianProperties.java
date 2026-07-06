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
}
