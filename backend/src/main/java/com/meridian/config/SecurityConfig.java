package com.meridian.config;

import com.meridian.distribution.CourseImportApiKeyFilter;
import com.meridian.security.JwtAuthenticationFilter;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private final MeridianProperties properties;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CourseImportApiKeyFilter courseImportApiKeyFilter;
    private final RateLimitFilter rateLimitFilter;

    public SecurityConfig(MeridianProperties properties,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            CourseImportApiKeyFilter courseImportApiKeyFilter,
            RateLimitFilter rateLimitFilter) {
        this.properties = properties;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.courseImportApiKeyFilter = courseImportApiKeyFilter;
        this.rateLimitFilter = rateLimitFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm ->
                    sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                    .referrerPolicy(rp -> rp.policy(ReferrerPolicy.NO_REFERRER))
                    // HSTS chỉ khi request đến qua HTTPS (trực tiếp hoặc proxy báo X-Forwarded-Proto: https) hoặc bật cờ
                    // force-hsts. Không includeSubDomains: tên miền cha còn các dịch vụ khác có thể chưa có HTTPS.
                    .httpStrictTransportSecurity(hsts -> hsts
                            .includeSubDomains(false)
                            .maxAgeInSeconds(15_552_000)
                            .requestMatcher(request -> properties.getSecurity().isForceHsts()
                                    || request.isSecure()
                                    || "https".equalsIgnoreCase(firstToken(request.getHeader("X-Forwarded-Proto"))))))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.POST,
                            "/api/auth/register", "/api/auth/register-parent",
                            "/api/auth/login", "/api/auth/refresh")
                    .permitAll()
                    // HEAD đi kèm GET: công cụ giám sát/kiểm tra liên kết hay dùng HEAD và trước đây nhận 401.
                    .requestMatchers(HttpMethod.GET, "/api/catalog/**").permitAll()
                    .requestMatchers(HttpMethod.HEAD, "/api/catalog/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/config/public").permitAll()
                    .requestMatchers(HttpMethod.HEAD, "/api/config/public").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/inquiries").permitAll()
                    .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                    .requestMatchers(HttpMethod.HEAD, "/uploads/**").permitAll()
                    .requestMatchers("/actuator/health", "/error").permitAll()
                    // Xác thực riêng bằng API key (CourseImportApiKeyFilter), không qua JWT.
                    .requestMatchers(HttpMethod.POST, "/api/catalog/import").permitAll()
                    .requestMatchers("/api/rbac-sync/**").permitAll()
                    .anyRequest().authenticated())
            .exceptionHandling(eh -> eh.authenticationEntryPoint(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(jwtAuthenticationFilter,
                    UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(courseImportApiKeyFilter, JwtAuthenticationFilter.class)
            // Sau CorsFilter (nên 429 vẫn có header CORS để trình duyệt đọc được), trước bước xác thực/băm mật khẩu.
            .addFilterBefore(rateLimitFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    private static String firstToken(String headerValue) {
        if (headerValue == null) {
            return "";
        }
        int comma = headerValue.indexOf(',');
        return (comma < 0 ? headerValue : headerValue.substring(0, comma)).trim();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.getCors().getAllowedOrigins());
        config.setAllowedMethods(
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new LengthSafeBCryptPasswordEncoder();
    }
}
