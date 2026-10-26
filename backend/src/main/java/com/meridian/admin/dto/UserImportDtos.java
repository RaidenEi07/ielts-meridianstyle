package com.meridian.admin.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/** DTO cho nhập tài khoản hàng loạt từ file Excel/CSV (file được đọc ở trình duyệt, gửi lên dạng danh sách dòng). */
public final class UserImportDtos {

    private UserImportDtos() {
    }

    /** Mỗi mục là 1 dòng của file; username để trống thì tự suy từ email. KHÔNG có mật khẩu — hệ thống tự sinh. */
    public record ImportRow(String fullName, String email, String username) {
    }

    public record ImportUsersRequest(
            @NotEmpty(message = "File không có dòng dữ liệu nào")
            @Size(max = 200, message = "Mỗi lần nhập tối đa 200 dòng") List<ImportRow> rows,
            Long classId,
            Long courseId) {
    }

    /** status: CREATED (tạo mới, có mật khẩu), EXISTING (email đã có tài khoản, không tạo lại), ERROR. */
    public record ImportRowResult(int line, String fullName, String email, String username,
            String password, String status, String message) {
    }

    public record ImportUsersResult(int created, int existing, int errors, int addedToClass,
            int newlyEnrolled, List<ImportRowResult> rows) {
    }
}
