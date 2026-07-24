package com.meridian.distribution;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Xác thực endpoint nhận khóa học ({@code POST /api/catalog/import}) bằng API key riêng của
 * web con (header {@code X-Meridian-Api-Key}) — request server-to-server từ web tổng, không
 * qua JWT người dùng. Key mong đợi được cấu hình 1 lần qua biến môi trường {@code MASTER_API_KEY}
 * (giống {@code SITE_ROLE}: bí mật riêng từng deployment, không phải config sửa được qua UI),
 * lấy đúng giá trị {@code apiKey} mà web tổng đã sinh cho web con này ở trang "Web con".
 */
@Component
public class CourseImportApiKeyFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Meridian-Api-Key";
    private static final String PATH = "/api/catalog/import";

    private final Environment env;

    public CourseImportApiKeyFilter(Environment env) {
        this.env = env;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        if (!"POST".equals(request.getMethod()) || !PATH.equals(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        String expected = env.getProperty("MASTER_API_KEY");
        String provided = request.getHeader(HEADER);
        boolean valid = expected != null && !expected.isBlank() && provided != null
                && MessageDigest.isEqual(
                        expected.getBytes(StandardCharsets.UTF_8),
                        provided.getBytes(StandardCharsets.UTF_8));

        if (!valid) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"message\":\"API key không hợp lệ hoặc web con chưa cấu hình MASTER_API_KEY\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
