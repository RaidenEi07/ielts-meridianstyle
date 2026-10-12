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
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự") String fullName,
        @Email(message = "Email không hợp lệ") @Size(max = 255, message = "Email tối đa 255 ký tự") String email,
        @Size(min = 8, max = 72, message = "Mật khẩu từ 8 đến 72 ký tự") String newPassword,
        @Size(max = 200, message = "Mật khẩu quá dài") String currentPassword,
        String status) {
}
