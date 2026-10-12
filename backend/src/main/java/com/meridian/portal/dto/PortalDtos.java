package com.meridian.portal.dto;

import com.meridian.portal.ContactInquiry;
import com.meridian.portal.TeacherProfile;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class PortalDtos {

    private PortalDtos() {
    }

    public record TeacherPublicDto(Long id, String fullName, String headline,
            String bio, String avatarUrl, int yearsExperience) {
        public static TeacherPublicDto from(TeacherProfile t) {
            return new TeacherPublicDto(t.getId(), t.getUser().getFullName(),
                    t.getHeadline(), t.getBio(), t.getAvatarUrl(), t.getYearsExperience());
        }
    }

    public record PublicStatsDto(long publishedCourses, long teachers, long students) {
    }

    /** Giới hạn khớp cột của contact_inquiries (V9): name 150, email 255, phone 40; message là TEXT nên tự đặt trần. */
    public record InquiryRequest(
            @NotBlank(message = "Họ tên là bắt buộc") @Size(max = 150, message = "Họ tên tối đa 150 ký tự") String name,
            @Size(max = 255, message = "Email tối đa 255 ký tự") String email,
            @Size(max = 40, message = "Số điện thoại tối đa 40 ký tự") String phone,
            @Size(max = 2000, message = "Nội dung tối đa 2000 ký tự") String message) {
    }

    public record InquiryDto(Long id, String name, String email, String phone,
            String message, String status, Instant createdAt) {
        public static InquiryDto from(ContactInquiry i) {
            return new InquiryDto(i.getId(), i.getName(), i.getEmail(), i.getPhone(),
                    i.getMessage(), i.getStatus().name(), i.getCreatedAt());
        }
    }
}
