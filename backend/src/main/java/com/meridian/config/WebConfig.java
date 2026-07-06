package com.meridian.config;

import org.springframework.context.annotation.Configuration;
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
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + properties.getUploads().getDir() + "/");
    }
}
