package com.meridian.rbac.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/** Thay TOÀN BỘ quyền lẻ của 1 user tại 1 khóa học bằng đúng danh sách này
 * (xóa hết grant cũ ở course đó rồi ghi lại từ đầu) — khớp UX "tick checkbox
 * rồi lưu 1 lần" thay vì gọi API riêng cho từng ô tick/bỏ tick. */
public record SetCourseGrantsRequest(@NotNull List<String> capabilities) {
}
