package com.meridian.rbac.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Sửa thông tin tài khoản — dùng chung cho 2 luồng: tự sửa hồ sơ của chính
 * mình (bất kỳ role nào, không cần capability, nhưng đổi mật khẩu bắt buộc
 * kèm currentPassword) và admin sửa tài khoản người khác (cần user:manage,
 * không cần currentPassword, có thể đổi cả status). Field null nghĩa là giữ
 * nguyên giá trị cũ, giống pattern optional-patch của CourseRequests.
 */
public record UpdateUserRequest(
        String fullName,
        @Email(message = "Email không hợp lệ") String email,
        @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự") String newPassword,
        String currentPassword,
        String status) {
}
