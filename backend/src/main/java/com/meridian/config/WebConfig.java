package com.meridian.config;

import java.time.Duration;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Phục vụ file đã upload (ảnh) qua HTTP tĩnh dưới /uploads/**. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final MeridianProperties properties;

    public WebConfig(MeridianProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Tên file upload luôn là UUID mới cho mỗi lần tải lên (MediaService), nên cho trình duyệt giữ bản sao một tuần.
        // Không đặt thì Spring Security tự gửi no-store và mọi lượt xem trang tải lại logo/ảnh/audio từ đầu.
        // Chỉ áp cho phản hồi tìm thấy file (404 không bị cache).
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + properties.getUploads().getDir() + "/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
    }
}
