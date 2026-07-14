package com.meridian.family.dto;

import com.meridian.user.User;
import java.util.UUID;

/** Tóm tắt hồ sơ con dùng cho danh sách của phụ huynh. */
public record ChildProfileDto(UUID id, String username, String fullName) {

    public static ChildProfileDto from(User user) {
        return new ChildProfileDto(user.getId(), user.getUsername(), user.getFullName());
    }
}
