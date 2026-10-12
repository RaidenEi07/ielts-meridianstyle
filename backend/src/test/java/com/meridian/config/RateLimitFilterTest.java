package com.meridian.config;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.FilterChain;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitFilterTest {

    /** Đồng hồ chỉnh tay được để kiểm tra việc hết cửa sổ mà không phải chờ. */
    static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-10-12T00:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private MeridianProperties.RateLimit config;
    private MutableClock clock;
    private RateLimitFilter filter;
    private AtomicInteger passed;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        config = new MeridianProperties.RateLimit();
        config.setInquiriesPerHour(3);
        config.setRegisterPerHour(2);
        config.setLoginPerFiveMinutes(4);
        clock = new MutableClock();
        filter = new RateLimitFilter(config, clock);
        passed = new AtomicInteger();
        chain = (req, res) -> passed.incrementAndGet();
    }

    private MockHttpServletResponse call(String method, String uri, String remoteAddr, String forwardedFor)
            throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test
    void allowsUpToTheLimitThenAnswers429WithRetryAfter() throws Exception {
        for (int i = 0; i < 3; i++) {
            assertThat(call("POST", "/api/inquiries", "203.0.113.5", null).getStatus()).isEqualTo(200);
        }
        MockHttpServletResponse blocked = call("POST", "/api/inquiries", "203.0.113.5", null);
        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getHeader("Retry-After")).isEqualTo("3600");
        assertThat(blocked.getContentAsString()).contains("\"status\":429").contains("Vui lòng thử lại sau 60 phút");
        assertThat(passed.get()).isEqualTo(3);
    }

    @Test
    void windowResetsAfterItExpires() throws Exception {
        for (int i = 0; i < 4; i++) {
            call("POST", "/api/inquiries", "203.0.113.5", null);
        }
        assertThat(call("POST", "/api/inquiries", "203.0.113.5", null).getStatus()).isEqualTo(429);
        clock.advance(Duration.ofMinutes(61));
        assertThat(call("POST", "/api/inquiries", "203.0.113.5", null).getStatus()).isEqualTo(200);
    }

    @Test
    void eachIpAndEachRuleHasItsOwnBudget() throws Exception {
        for (int i = 0; i < 4; i++) {
            call("POST", "/api/inquiries", "203.0.113.5", null);
        }
        assertThat(call("POST", "/api/inquiries", "203.0.113.5", null).getStatus()).isEqualTo(429);
        assertThat(call("POST", "/api/inquiries", "203.0.113.6", null).getStatus()).isEqualTo(200);
        assertThat(call("POST", "/api/auth/login", "203.0.113.5", null).getStatus()).isEqualTo(200);
    }

    @Test
    void registerAndRegisterParentShareOneBudget() throws Exception {
        assertThat(call("POST", "/api/auth/register", "203.0.113.5", null).getStatus()).isEqualTo(200);
        assertThat(call("POST", "/api/auth/register-parent", "203.0.113.5", null).getStatus()).isEqualTo(200);
        assertThat(call("POST", "/api/auth/register", "203.0.113.5", null).getStatus()).isEqualTo(429);
    }

    @Test
    void onlyPostToTheGuardedPathsIsCounted() throws Exception {
        for (int i = 0; i < 20; i++) {
            assertThat(call("GET", "/api/inquiries", "203.0.113.5", null).getStatus()).isEqualTo(200);
            assertThat(call("POST", "/api/courses", "203.0.113.5", null).getStatus()).isEqualTo(200);
        }
        assertThat(filter.trackedKeys()).isZero();
    }

    @Test
    void disabledFilterNeverBlocks() throws Exception {
        config.setEnabled(false);
        for (int i = 0; i < 30; i++) {
            assertThat(call("POST", "/api/inquiries", "203.0.113.5", null).getStatus()).isEqualTo(200);
        }
    }

    @Test
    void forwardedForIsIgnoredWhenTheCallerIsNotAnInternalProxy() throws Exception {
        // Kẻ gọi trực tiếp từ IP công cộng tự đặt X-Forwarded-For khác nhau mỗi lần để né giới hạn.
        for (int i = 0; i < 4; i++) {
            call("POST", "/api/inquiries", "203.0.113.5", "198.51.100." + i);
        }
        assertThat(call("POST", "/api/inquiries", "203.0.113.5", "198.51.100.99").getStatus()).isEqualTo(429);
    }

    @Test
    void behindAnInternalProxyTheLastForwardedAddressIdentifiesTheClient() throws Exception {
        // nginx nối địa chỉ thật vào CUỐI; phần đầu là do client tự thêm nên không đáng tin.
        for (int i = 0; i < 3; i++) {
            call("POST", "/api/inquiries", "172.18.0.5", "10.9.9." + i + ", 203.0.113.7");
        }
        assertThat(call("POST", "/api/inquiries", "172.18.0.5", "1.2.3.4, 203.0.113.7").getStatus()).isEqualTo(429);
        // Khách khác sau cùng proxy vẫn bình thường.
        assertThat(call("POST", "/api/inquiries", "172.18.0.5", "203.0.113.8").getStatus()).isEqualTo(200);
    }

    @Test
    void garbageForwardedHeaderFallsBackToTheSocketAddress() throws Exception {
        for (int i = 0; i < 3; i++) {
            call("POST", "/api/inquiries", "172.18.0.5", "not-an-ip");
        }
        assertThat(call("POST", "/api/inquiries", "172.18.0.5", "<script>").getStatus()).isEqualTo(429);
    }

    @Test
    void internalAddressDetection() {
        assertThat(RateLimitFilter.isInternal("127.0.0.1")).isTrue();
        assertThat(RateLimitFilter.isInternal("::1")).isTrue();
        assertThat(RateLimitFilter.isInternal("10.1.2.3")).isTrue();
        assertThat(RateLimitFilter.isInternal("172.16.0.1")).isTrue();
        assertThat(RateLimitFilter.isInternal("172.31.255.255")).isTrue();
        assertThat(RateLimitFilter.isInternal("192.168.1.7")).isTrue();
        assertThat(RateLimitFilter.isInternal("fd12:3456::1")).isTrue();
        assertThat(RateLimitFilter.isInternal("172.32.0.1")).isFalse();
        assertThat(RateLimitFilter.isInternal("203.0.113.5")).isFalse();
        assertThat(RateLimitFilter.isInternal("2001:db8::1")).isFalse();
        assertThat(RateLimitFilter.isInternal("example.com")).isFalse();
    }
}
