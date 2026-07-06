package com.meridian.portal.dto;

import com.meridian.portal.ContactInquiry;
import com.meridian.portal.TeacherProfile;
import jakarta.validation.constraints.NotBlank;
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

    public record InquiryRequest(
            @NotBlank(message = "Họ tên là bắt buộc") String name,
            String email, String phone, String message) {
    }

    public record InquiryDto(Long id, String name, String email, String phone,
            String message, String status, Instant createdAt) {
        public static InquiryDto from(ContactInquiry i) {
            return new InquiryDto(i.getId(), i.getName(), i.getEmail(), i.getPhone(),
                    i.getMessage(), i.getStatus().name(), i.getCreatedAt());
        }
    }
}
