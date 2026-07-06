package com.meridian.admin.dto;

import com.meridian.admin.Notification;
import com.meridian.admin.SystemAnnouncement;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;

/** DTO cho module Admin Tools. */
public final class AdminDtos {

    private AdminDtos() {
    }

    public record AnnouncementDto(Long id, String title, String body, String level,
            boolean active, Instant createdAt) {
        public static AnnouncementDto from(SystemAnnouncement a) {
            return new AnnouncementDto(a.getId(), a.getTitle(), a.getBody(),
                    a.getLevel().name(), a.isActive(), a.getCreatedAt());
        }
    }

    public record AnnouncementRequest(
            @NotBlank(message = "Tiêu đề là bắt buộc") String title,
            String body, String level, Boolean active) {
    }

    public record NotificationDto(Long id, String title, String body, String link,
            boolean read, Instant createdAt) {
        public static NotificationDto from(Notification n) {
            return new NotificationDto(n.getId(), n.getTitle(), n.getBody(), n.getLink(),
                    n.getReadAt() != null, n.getCreatedAt());
        }
    }

    public record BroadcastRequest(
            @NotBlank(message = "Tiêu đề là bắt buộc") String title,
            String body, String link) {
    }

    /** username là tùy chọn — nếu bỏ trống sẽ tự sinh từ phần trước @ của email. */
    public record BulkUserRow(String username, String email, String fullName, String password) {
    }

    public record BulkImportRequest(List<BulkUserRow> users) {
    }

    public record BulkImportResult(int created, int skipped, List<String> errors) {
    }
}
