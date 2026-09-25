package com.meridian.distribution;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.meridian.common.ApiException;
import com.sun.net.httpserver.HttpServer;
import java.net.ConnectException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import javax.net.ssl.SSLHandshakeException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

class ChildSiteUrlGuardTest {

    // Tên -> IP lấy từ map (không gọi DNS thật); IP literal được parse thẳng; tên lạ -> không phân giải được.
    private static ChildSiteUrlGuard.HostResolver resolverOf(Map<String, String[]> dns) {
        return host -> {
            String[] ips = dns.get(host.toLowerCase());
            if (ips != null) {
                InetAddress[] out = new InetAddress[ips.length];
                for (int i = 0; i < ips.length; i++) {
                    out[i] = InetAddress.getByName(ips[i]);
                }
                return out;
            }
            if (host.matches("[0-9a-fA-F:.]+")) {
                return InetAddress.getAllByName(host);
            }
            throw new UnknownHostException(host);
        };
    }

    private static ChildSiteUrlGuard strict(Map<String, String[]> dns) {
        return new ChildSiteUrlGuard(false, resolverOf(dns));
    }

    private static final Map<String, String[]> DNS = Map.of(
            "api-ielts.sunshineschool.edu.vn", new String[] {"221.132.21.13"},
            "a.example.com", new String[] {"93.184.216.34"},
            "evil.example.com", new String[] {"10.1.2.3"},
            "meta.example.com", new String[] {"169.254.169.254"},
            "mixed.example.com", new String[] {"93.184.216.34", "169.254.169.254"},
            "localhost", new String[] {"127.0.0.1"});

    @Test
    void acceptsPublicHttpsHostAndNormalizes() {
        assertThat(strict(DNS).requireSafeBaseUrl("  HTTPS://API-IELTS.Sunshineschool.edu.vn:8443/lms/  "))
                .isEqualTo("https://api-ielts.sunshineschool.edu.vn:8443/lms");
        assertThat(strict(DNS).requireSafeBaseUrl("https://a.example.com/"))
                .isEqualTo("https://a.example.com");
    }

    @Test
    void rejectsPlainHttpEvenForPublicHost() {
        assertThatThrownBy(() -> strict(DNS).requireSafeBaseUrl("http://a.example.com"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("https://");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "ftp://a.example.com", "file:///etc/passwd", "gopher://a.example.com", "javascript:alert(1)",
            "example.com", "//a.example.com", "https://", "https:///path", "not a url",
            "https://exa mple.com", "", "   "})
    void rejectsOtherSchemesAndMalformedInput(String raw) {
        assertThatThrownBy(() -> strict(DNS).requireSafeBaseUrl(raw)).isInstanceOf(ApiException.class);
    }

    @Test
    void rejectsNullInput() {
        assertThatThrownBy(() -> strict(DNS).requireSafeBaseUrl(null)).isInstanceOf(ApiException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://user:pw@a.example.com", "https://a.example.com/?x=1", "https://a.example.com/#frag"})
    void rejectsCredentialsQueryAndFragment(String raw) {
        assertThatThrownBy(() -> strict(DNS).requireSafeBaseUrl(raw)).isInstanceOf(ApiException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://127.0.0.1", "https://127.0.0.53:8443", "https://10.0.0.5", "https://172.16.0.1",
            "https://172.31.255.255", "https://192.168.1.1", "https://169.254.169.254/latest/meta-data",
            "https://0.0.0.0", "https://0.1.2.3", "https://100.64.0.1", "https://100.127.255.255",
            "https://224.0.0.1", "https://255.255.255.255", "https://240.0.0.1", "https://198.18.0.1",
            "https://198.19.255.255", "https://198.51.100.7", "https://203.0.113.9", "https://192.0.2.1",
            "https://[::1]", "https://[::]", "https://[fd00::1]", "https://[fc00::1]", "https://[fe80::1]",
            "https://[::ffff:127.0.0.1]", "https://[::ffff:169.254.169.254]", "https://[64:ff9b::a00:1]",
            "https://[2002:7f00:1::]", "https://[2001:db8::1]", "https://localhost", "https://evil.example.com",
            "https://meta.example.com"})
    void rejectsNonPublicTargets(String raw) {
        assertThatThrownBy(() -> strict(DNS).requireSafeBaseUrl(raw))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Không xác minh được");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://8.8.8.8", "https://1.1.1.1", "https://93.184.216.34", "https://172.15.255.255",
            "https://172.32.0.1", "https://100.63.255.255", "https://100.128.0.1", "https://198.17.255.255",
            "https://198.20.0.1", "https://223.255.255.254", "https://[2606:4700:4700::1111]",
            "https://[2001:4860:4860::8888]"})
    void acceptsAddressesJustOutsideBlockedRanges(String raw) {
        assertThat(strict(DNS).requireSafeBaseUrl(raw)).startsWith("https://");
    }

    @Test
    void rejectsWhenAnyResolvedAddressIsNonPublic() {
        assertThatThrownBy(() -> strict(DNS).requireSafeBaseUrl("https://mixed.example.com"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Không xác minh được");
    }

    @Test
    void unresolvableAndPrivateHostsGetTheSameMessage() {
        String unresolvable = messageOf(() -> strict(DNS).requireSafeBaseUrl("https://nope.example.com"));
        String internal = messageOf(() -> strict(DNS).requireSafeBaseUrl("https://evil.example.com"));
        assertThat(unresolvable).isEqualTo(internal);
    }

    @Test
    void allowPrivateTargetsModeSkipsAddressChecksButKeepsSchemeAndHostChecks() {
        ChildSiteUrlGuard lenient = new ChildSiteUrlGuard(true, host -> {
            throw new UnknownHostException("DNS không được gọi ở chế độ này");
        });
        assertThat(lenient.requireSafeBaseUrl("http://localhost:8091")).isEqualTo("http://localhost:8091");
        assertThat(lenient.requireSafeBaseUrl("https://10.0.0.5")).isEqualTo("https://10.0.0.5");
        assertThatThrownBy(() -> lenient.requireSafeBaseUrl("ftp://localhost")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> lenient.requireSafeBaseUrl("http://")).isInstanceOf(ApiException.class);
    }

    @Test
    void describeFailureNeverLeaksRemoteBodiesOrRawExceptionText() {
        String connect = ChildSiteUrlGuard.describeFailure(
                new ResourceAccessException("I/O error", new ConnectException("Connection refused: /172.18.0.5:5432")));
        assertThat(connect).contains("không kết nối được").doesNotContain("172.18");

        String unauthorized = ChildSiteUrlGuard.describeFailure(HttpClientErrorException.create(
                HttpStatus.UNAUTHORIZED, "Unauthorized", HttpHeaders.EMPTY,
                "secret-body".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8));
        assertThat(unauthorized).contains("API key").contains("401").doesNotContain("secret-body");

        String serverError = ChildSiteUrlGuard.describeFailure(HttpServerErrorException.create(
                HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", HttpHeaders.EMPTY,
                "{\"role\":\"ROLE-CREDENTIALS\"}".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8));
        assertThat(serverError).contains("500").doesNotContain("ROLE-CREDENTIALS");

        assertThat(ChildSiteUrlGuard.describeFailure(new RuntimeException("jdbc:postgresql://10.0.0.9:5432/x")))
                .doesNotContain("10.0.0.9");
        assertThat(ChildSiteUrlGuard.describeFailure(
                new ResourceAccessException("x", new SocketTimeoutException("Read timed out"))))
                .contains("hết thời gian chờ");
        assertThat(ChildSiteUrlGuard.describeFailure(
                new ResourceAccessException("x", new SSLHandshakeException("PKIX path building failed"))))
                .contains("chứng chỉ");
        assertThat(ChildSiteUrlGuard.describeFailure(ApiException.badRequest("Thông báo của guard")))
                .isEqualTo("Thông báo của guard");
    }

    @Test
    void noRedirectFactoryDoesNotFollowRedirectsUnlikeTheDefaultFactory() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/a", ex -> {
            ex.getResponseHeaders().add("Location", "/b");
            ex.sendResponseHeaders(302, -1);
            ex.close();
        });
        server.createContext("/b", ex -> {
            byte[] body = "ok".getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(200, body.length);
            ex.getResponseBody().write(body);
            ex.close();
        });
        server.start();
        try {
            String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/a";

            ResponseEntity<Void> guarded = RestClient.builder()
                    .requestFactory(ChildSiteUrlGuard.noRedirectRequestFactory(
                            Duration.ofSeconds(2), Duration.ofSeconds(2)))
                    .build().get().uri(url).retrieve().toBodilessEntity();
            assertThat(guarded.getStatusCode().value()).isEqualTo(302);

            ResponseEntity<Void> control = RestClient.builder()
                    .requestFactory(new SimpleClientHttpRequestFactory())
                    .build().get().uri(url).retrieve().toBodilessEntity();
            assertThat(control.getStatusCode().value()).isEqualTo(200);
        } finally {
            server.stop(0);
        }
    }

    private static String messageOf(Runnable action) {
        try {
            action.run();
        } catch (ApiException e) {
            return e.getMessage();
        }
        throw new AssertionError("Không ném ApiException");
    }
}
