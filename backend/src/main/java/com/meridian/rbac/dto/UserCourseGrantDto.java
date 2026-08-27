package com.meridian.rbac.dto;

import java.util.List;

/** Toàn bộ quyền lẻ (không qua role) mà 1 tài khoản đang có tại 1 khóa học cụ
 * thể — 1 dòng cho mỗi khóa đã được gán ít nhất 1 quyền lẻ. */
public record UserCourseGrantDto(Long courseId, String courseTitle, List<String> capabilities) {
}
