package com.meridian.distribution.dto;

import com.meridian.distribution.ChildSite;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public final class ChildSiteDtos {

    private ChildSiteDtos() {
    }

    public record ChildSiteDto(Long id, String name, String baseUrl, String apiKey,
            boolean active, Instant createdAt) {
        public static ChildSiteDto from(ChildSite c) {
            return new ChildSiteDto(c.getId(), c.getName(), c.getBaseUrl(), c.getApiKey(),
                    c.isActive(), c.getCreatedAt());
        }
    }

    public record CreateChildSite(
            @NotBlank(message = "Tên là bắt buộc") String name,
            @NotBlank(message = "Base URL là bắt buộc") String baseUrl) {
    }

    public record UpdateChildSite(String name, String baseUrl, Boolean active) {
    }
}
