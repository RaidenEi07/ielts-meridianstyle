package com.meridian.classroom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public final class ClassDtos {

    private ClassDtos() {
    }

    public record ClassSummary(Long id, String name, String description, int memberCount, int courseCount) {
    }

    public record ClassMemberDto(UUID userId, String username, String fullName, String email, String status) {
    }

    public record ClassCourseDto(Long courseId, String title, String status) {
    }

    public record ClassDetail(Long id, String name, String description,
            List<ClassMemberDto> members, List<ClassCourseDto> courses) {
    }

    public record SaveClass(
            @NotBlank(message = "Tên lớp là bắt buộc")
            @Size(max = 150, message = "Tên lớp tối đa 150 ký tự") String name,
            @Size(max = 500, message = "Mô tả tối đa 500 ký tự") String description) {
    }

    public record AddMembers(
            @NotEmpty(message = "Chưa chọn tài khoản nào")
            @Size(max = 2000, message = "Mỗi lần thêm tối đa 2000 tài khoản") List<UUID> userIds) {
    }

    public record LinkCourse(@NotNull(message = "courseId là bắt buộc") Long courseId) {
    }

    /** added = số người mới vào lớp; newlyEnrolled = số lượt ghi danh mới phát sinh (cộng qua các khóa của lớp). */
    public record AddMembersResult(int added, int alreadyInClass, int notFound, int newlyEnrolled) {
    }

    public record LinkCourseResult(int memberCount, int newlyEnrolled, int alreadyEnrolled) {
    }
}
