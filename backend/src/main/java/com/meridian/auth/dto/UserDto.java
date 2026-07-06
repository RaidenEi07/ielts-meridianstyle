package com.meridian.auth.dto;

import com.meridian.user.User;
import java.util.UUID;

public record UserDto(UUID id, String username, String email, String fullName, String status) {

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getEmail(),
                user.getFullName(), user.getStatus().name());
    }
}
