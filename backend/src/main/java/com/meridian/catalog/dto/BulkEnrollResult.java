package com.meridian.catalog.dto;

/** Kết quả ghi danh nhiều người vào 1 khóa: mới ghi danh, đã có sẵn từ trước, không tìm thấy tài khoản. */
public record BulkEnrollResult(int enrolled, int alreadyEnrolled, int notFound) {
}
