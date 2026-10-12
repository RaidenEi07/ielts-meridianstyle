package com.meridian.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Giới hạn tần suất theo IP cho vài endpoint công khai dễ bị lạm dụng: phiếu tư vấn, tạo tài khoản, đăng nhập.
 * Không có thư viện ngoài: bộ đếm cửa sổ cố định trong bộ nhớ (đủ cho 1 instance; restart thì đếm lại từ 0).
 *
 * <p>IP người gọi: nếu kết nối đến trực tiếp từ IP công cộng thì dùng chính IP đó và BỎ QUA X-Forwarded-For (kẻ
 * tấn công tự đặt được header này). Chỉ khi request đến từ mạng nội bộ/loopback (nginx cùng máy hoặc cùng mạng
 * Docker) mới tin phần tử CUỐI của X-Forwarded-For — chính là địa chỉ mà proxy đã thấy. Request từ mạng nội bộ mà
 * KHÔNG có X-Forwarded-For hợp lệ (proxy cấu hình thiếu, gọi nội bộ) thì không xác định được người gọi → không giới
 * hạn: nếu gộp chung theo IP của proxy thì cả trường dùng chung một bộ đếm và bị chặn cùng lúc.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    /** Quá số này khóa khác nhau thì quét dọn; vẫn quá thì xóa hết (thà bỏ đếm còn hơn đầy bộ nhớ). */
    private static final int SWEEP_THRESHOLD = 5_000;
    private static final int HARD_CAP = 100_000;
    private static final long SWEEP_INTERVAL_MS = 60_000;

    record Rule(String name, int max, Duration window) {
    }

    private static final class Counter {
        final long windowStartMs;
        int count;

        Counter(long windowStartMs) {
            this.windowStartMs = windowStartMs;
        }
    }

    private final MeridianProperties.RateLimit config;
    private final Clock clock;
    private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();
    private volatile long lastSweepMs;
    private volatile boolean warnedUnidentified;

    @Autowired
    public RateLimitFilter(MeridianProperties properties) {
        this(properties.getRateLimit(), Clock.systemUTC());
    }

    RateLimitFilter(MeridianProperties.RateLimit config, Clock clock) {
        this.config = config;
        this.clock = clock;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response, @NonNull FilterChain chain)
            throws ServletException, IOException {
        Rule rule = config.isEnabled() ? ruleFor(request) : null;
        if (rule == null) {
            chain.doFilter(request, response);
            return;
        }
        String ip = clientIp(request);
        if (ip == null) {
            if (!warnedUnidentified) {
                warnedUnidentified = true;
                log.warn("Không xác định được IP người gọi (kết nối nội bộ, thiếu X-Forwarded-For hợp lệ) — bỏ qua "
                        + "giới hạn tần suất. Kiểm tra proxy có đặt X-Forwarded-For không.");
            }
            chain.doFilter(request, response);
            return;
        }
        long retryAfterSec = tryAcquire(rule.name() + ":" + ip, rule);
        if (retryAfterSec == 0) {
            chain.doFilter(request, response);
            return;
        }
        log.warn("Rate limit '{}' vượt ngưỡng từ {} — chặn {}s", rule.name(), ip, retryAfterSec);
        long minutes = Math.max(1, (retryAfterSec + 59) / 60);
        String body = "{\"timestamp\":\"" + Instant.now(clock) + "\",\"status\":429,"
                + "\"error\":\"Too Many Requests\",\"message\":\"Bạn thao tác quá nhanh. "
                + "Vui lòng thử lại sau " + minutes + " phút.\"}";
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSec));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(body);
    }

    private Rule ruleFor(HttpServletRequest request) {
        if (!"POST".equals(request.getMethod())) {
            return null;
        }
        return switch (request.getRequestURI()) {
            case "/api/inquiries" -> new Rule("inquiries", config.getInquiriesPerHour(), Duration.ofHours(1));
            case "/api/auth/register", "/api/auth/register-parent" ->
                    new Rule("register", config.getRegisterPerHour(), Duration.ofHours(1));
            case "/api/auth/login" -> new Rule("login", config.getLoginPerFiveMinutes(), Duration.ofMinutes(5));
            default -> null;
        };
    }

    /** @return 0 nếu được phép; ngược lại số giây phải chờ tới khi cửa sổ hiện tại kết thúc. */
    long tryAcquire(String key, Rule rule) {
        long now = clock.millis();
        sweepIfNeeded(now);
        long windowMs = rule.window().toMillis();
        Counter counter = counters.compute(key, (k, c) -> {
            if (c == null || now - c.windowStartMs >= windowMs) {
                c = new Counter(now);
            }
            c.count++;
            return c;
        });
        if (counter.count <= rule.max()) {
            return 0;
        }
        return Math.max(1, (counter.windowStartMs + windowMs - now + 999) / 1000);
    }

    /** Dành cho test: số phần tử đang giữ. */
    int trackedKeys() {
        return counters.size();
    }

    private void sweepIfNeeded(long now) {
        int size = counters.size();
        if (size < SWEEP_THRESHOLD || now - lastSweepMs < SWEEP_INTERVAL_MS) {
            return;
        }
        lastSweepMs = now;
        long longestWindow = Duration.ofHours(1).toMillis();
        counters.entrySet().removeIf(e -> now - e.getValue().windowStartMs >= longestWindow);
        if (counters.size() > HARD_CAP) {
            counters.clear();
        }
    }

    // ---- Xác định IP người gọi ----

    /** @return IP người gọi, hoặc null nếu không xác định được (xem mô tả lớp). */
    static String clientIp(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (remote == null || remote.isBlank()) {
            return null;
        }
        if (!isInternal(remote)) {
            return remote;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] parts = forwarded.split(",");
            String last = parts[parts.length - 1].trim();
            if (isIpLiteral(last)) {
                return last;
            }
        }
        return null;
    }

    private static boolean isIpLiteral(String s) {
        if (s.isEmpty() || s.length() > 45) {
            return false;
        }
        boolean v4 = s.matches("\\d{1,3}(\\.\\d{1,3}){3}");
        boolean v6 = s.indexOf(':') >= 0 && s.matches("[0-9a-fA-F:.]+");
        return v4 || v6;
    }

    /** Loopback, mạng riêng (10/8, 172.16/12, 192.168/16), link-local, IPv6 ULA (fc00::/7). */
    static boolean isInternal(String address) {
        if (!isIpLiteral(address)) {
            return false;
        }
        try {
            InetAddress ip = InetAddress.getByName(address); // chỉ phân tích literal, không tra DNS
            if (ip.isLoopbackAddress() || ip.isSiteLocalAddress() || ip.isLinkLocalAddress()) {
                return true;
            }
            byte[] raw = ip.getAddress();
            return raw.length == 16 && (raw[0] & 0xFE) == 0xFC;
        } catch (UnknownHostException e) {
            return false;
        }
    }
}
