package com.meridian.common;

import jakarta.validation.ConstraintViolationException;
import java.sql.SQLException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Chuyển mọi lỗi thành JSON cùng một dạng ({@code timestamp, status, error, message, details?}).
 *
 * <p>Kế thừa {@link ResponseEntityExceptionHandler} để các lỗi chuẩn của Spring MVC giữ ĐÚNG mã trạng thái
 * (sai Content-Type → 415, sai kiểu tham số/đường dẫn → 400, đường dẫn không có → 404, sai method → 405...).
 * Trước đây {@code @ExceptionHandler(Exception.class)} nuốt hết thành 500 và còn ghi stack trace ERROR vào log
 * cho cả lỗi do người gọi gây ra, che mất lỗi thật của máy chủ.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Object> handleApi(ApiException ex) {
        return build(ex.getStatus(), ex.getMessage(), null);
    }

    /** Lỗi ràng buộc dữ liệu từ DB: quá dài/thiếu → 400, trùng/đang được tham chiếu → 409 (không còn là 500). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> handleDataIntegrity(DataIntegrityViolationException ex) {
        String state = sqlState(ex);
        log.warn("Vi phạm ràng buộc dữ liệu (SQLState {}): {}", state, ex.getMostSpecificCause().getMessage());
        return switch (state == null ? "" : state) {
            case "22001" -> build(HttpStatus.BAD_REQUEST, "Dữ liệu quá dài so với giới hạn cho phép", null);
            case "22003", "22P02", "23502", "23514" ->
                    build(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ hoặc thiếu trường bắt buộc", null);
            case "23505" -> build(HttpStatus.CONFLICT, "Dữ liệu đã tồn tại", null);
            case "23503" -> build(HttpStatus.CONFLICT,
                    "Dữ liệu đang được sử dụng ở nơi khác hoặc tham chiếu tới dữ liệu không tồn tại", null);
            default -> build(HttpStatus.CONFLICT, "Dữ liệu xung đột hoặc không hợp lệ", null);
        };
    }

    /** Ràng buộc đặt trên @RequestParam/@PathVariable (khi controller dùng @Validated). */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Object> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, String> fields = ex.getConstraintViolations().stream()
                .collect(Collectors.toMap(v -> v.getPropertyPath().toString(), v -> v.getMessage(),
                        (a, b) -> a, LinkedHashMap::new));
        return build(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ", fields);
    }

    /** Ném từ trong controller/service (ngoài chuỗi bộ lọc của Spring Security) thì vẫn phải là 403, không phải 500. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này", null);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> handleAuthentication(AuthenticationException ex) {
        return build(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập hoặc phiên đã hết hạn", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi không mong muốn", null);
    }

    // ---- Lỗi chuẩn của Spring MVC: giữ đúng mã trạng thái, đổi sang cùng dạng JSON ----

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fields = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField,
                        fe -> fe.getDefaultMessage() == null ? "không hợp lệ" : fe.getDefaultMessage(),
                        (a, b) -> a));
        return build(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ", fields);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        // Chi tiết kỹ thuật (tên class/phương thức nội bộ, vị trí lỗi JSON) chỉ ghi log, không trả cho người gọi.
        log.warn("Body không đọc được: {}", ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.BAD_REQUEST, "Body request không hợp lệ hoặc thiếu dữ liệu", null);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
            HttpStatusCode statusCode, WebRequest request) {
        HttpStatus status = HttpStatus.resolve(statusCode.value());
        if (statusCode.is5xxServerError()) {
            log.error("Lỗi máy chủ trong Spring MVC ({})", statusCode.value(), ex);
        } else {
            log.debug("Yêu cầu bị từ chối ({}): {}", statusCode.value(), ex.getMessage());
        }
        ResponseEntity<Object> response = build(status != null ? status : HttpStatus.INTERNAL_SERVER_ERROR,
                messageFor(statusCode), null);
        // Giữ các header do Spring đặt (vd Allow cho 405, Accept cho 415).
        HttpHeaders merged = new HttpHeaders();
        merged.putAll(headers);
        merged.putAll(response.getHeaders());
        return new ResponseEntity<>(response.getBody(), merged, response.getStatusCode());
    }

    private static String messageFor(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> "Yêu cầu không hợp lệ";
            case 404 -> "Không tìm thấy tài nguyên";
            case 405 -> "Phương thức không được hỗ trợ cho đường dẫn này";
            case 406 -> "Định dạng phản hồi yêu cầu không được hỗ trợ";
            case 413 -> "Dữ liệu gửi lên quá lớn";
            case 415 -> "Định dạng dữ liệu gửi lên không được hỗ trợ";
            case 503 -> "Dịch vụ tạm thời không khả dụng";
            default -> status.is4xxClientError() ? "Yêu cầu không hợp lệ" : "Đã xảy ra lỗi không mong muốn";
        };
    }

    /** SQLState của lỗi gốc trong chuỗi nguyên nhân (nếu có). */
    private static String sqlState(Throwable ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof SQLException sql && sql.getSQLState() != null) {
                return sql.getSQLState();
            }
            if (t.getCause() == t) {
                break;
            }
        }
        return null;
    }

    private static ResponseEntity<Object> build(HttpStatus status, String message, Object details) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        if (details != null) {
            body.put("details", details);
        }
        return ResponseEntity.status(status).body(body);
    }
}
