package com.meridian.distribution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/**
 * DTO trao đổi giữa web tổng và web con cho việc web tổng xem/sửa role +
 * quyền lẻ theo khóa của tài khoản ĐANG TỒN TẠI ở web con — khác hẳn
 * {@code com.meridian.rbac.dto.*} (dùng nội bộ 1 deployment, mang ID số cục
 * bộ vô nghĩa giữa 2 hệ thống): ở đây chỉ dùng định danh ỔN ĐỊNH giữa mọi
 * deployment (role shortname, course shortname — cùng quy ước với
 * CourseBundle/CourseImportService), không bao giờ mang context_id/role_id
 * số vì 2 hệ thống có 2 bộ ID độc lập.
 */
public final class RbacSyncDtos {

    private RbacSyncDtos() {
    }

    /** 1 tài khoản trên web con, kèm role hệ thống hiện có (chỉ shortname). */
    public record SyncAccountDto(
            UUID userId, String username, String email, String fullName, String status,
            List<String> roleShortnames) {
    }

    /** Quyền lẻ theo 1 khóa học cụ thể (khớp theo shortname, không phải id cục bộ). */
    public record SyncCourseGrantDto(String courseShortname, String courseTitle, List<String> capabilities) {
    }

    public record AssignRoleSyncRequest(
            @NotNull(message = "userId là bắt buộc") UUID userId,
            @NotBlank(message = "roleShortname là bắt buộc") String roleShortname) {
    }

    public record SetCourseGrantsSyncRequest(
            @NotBlank(message = "courseShortname là bắt buộc") String courseShortname,
            @NotNull List<String> capabilities) {
    }
}
