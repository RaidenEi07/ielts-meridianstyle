package com.meridian.roster.dto;

import com.meridian.user.User;
import java.util.UUID;

/** Tóm tắt học sinh dùng cho danh sách roster của giáo viên. */
public record StudentSummaryDto(UUID id, String username, String email, String fullName) {

    public static StudentSummaryDto from(User user) {
        return new StudentSummaryDto(
                user.getId(), user.getUsername(), user.getEmail(), user.getFullName());
    }
}
