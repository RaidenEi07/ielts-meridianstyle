package com.meridian.distribution;

import com.meridian.common.ApiException;
import com.meridian.config.MeridianProperties;
import java.io.IOException;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.NoRouteToHostException;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import javax.net.ssl.SSLException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;

/** Chống SSRF cho địa chỉ web con: chỉ https tới IP công khai, không theo chuyển hướng, không lộ chi tiết lỗi. */
@Component
public class ChildSiteUrlGuard {

    @FunctionalInterface
    interface HostResolver {
        InetAddress[] resolve(String host) throws UnknownHostException;
    }

    // Cùng 1 thông báo cho "không phân giải được" và "trỏ vào IP nội bộ" để không dò được tên miền nội bộ.
    private static final String NOT_VERIFIED =
            "Không xác minh được địa chỉ web con — cần là địa chỉ https:// công khai";

    // Java đã lo loopback/link-local/site-local/multicast; đây là các dải còn lại không được đi ra.
    private static final List<Cidr> BLOCKED = List.of(
            Cidr.of("0.0.0.0", 8), Cidr.of("100.64.0.0", 10), Cidr.of("192.0.0.0", 24),
            Cidr.of("192.0.2.0", 24), Cidr.of("192.88.99.0", 24), Cidr.of("198.18.0.0", 15),
            Cidr.of("198.51.100.0", 24), Cidr.of("203.0.113.0", 24), Cidr.of("240.0.0.0", 4),
            Cidr.of("::", 96), Cidr.of("64:ff9b::", 96), Cidr.of("64:ff9b:1::", 48),
            Cidr.of("100::", 64), Cidr.of("2001::", 32), Cidr.of("2001:db8::", 32),
            Cidr.of("2002::", 16), Cidr.of("fc00::", 7));

    private final boolean allowPrivateTargets;
    private final HostResolver resolver;

    @Autowired
    public ChildSiteUrlGuard(MeridianProperties properties) {
        this(properties.getDistribution().isAllowPrivateTargets(), InetAddress::getAllByName);
    }

    ChildSiteUrlGuard(boolean allowPrivateTargets, HostResolver resolver) {
        this.allowPrivateTargets = allowPrivateTargets;
        this.resolver = resolver;
    }

    /** Kiểm tra + chuẩn hóa địa chỉ web con; gọi cả lúc lưu và ngay trước mỗi request ra ngoài. */
    public String requireSafeBaseUrl(String raw) {
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("Địa chỉ web con là bắt buộc");
        }
        URI uri;
        try {
            uri = new URI(raw.trim()).normalize();
        } catch (URISyntaxException e) {
            throw ApiException.badRequest("Địa chỉ web con không hợp lệ");
        }

        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (allowPrivateTargets ? !(scheme.equals("https") || scheme.equals("http")) : !scheme.equals("https")) {
            throw ApiException.badRequest(allowPrivateTargets
                    ? "Địa chỉ web con phải bắt đầu bằng http:// hoặc https://"
                    : "Địa chỉ web con phải bắt đầu bằng https://");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw ApiException.badRequest("Địa chỉ web con thiếu tên miền");
        }
        if (uri.getRawUserInfo() != null) {
            throw ApiException.badRequest("Địa chỉ web con không được chứa tài khoản/mật khẩu");
        }
        if (uri.getRawQuery() != null || uri.getRawFragment() != null) {
            throw ApiException.badRequest("Địa chỉ web con chỉ gồm tên miền (và cổng nếu có), không kèm tham số");
        }

        if (!allowPrivateTargets) {
            requirePublicHost(host);
        }

        String path = uri.getRawPath() == null ? "" : uri.getRawPath();
        while (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return scheme + "://" + host.toLowerCase(Locale.ROOT)
                + (uri.getPort() != -1 ? ":" + uri.getPort() : "") + path;
    }

    private void requirePublicHost(String host) {
        String bare = host.startsWith("[") && host.endsWith("]") ? host.substring(1, host.length() - 1) : host;
        InetAddress[] addresses;
        try {
            addresses = resolver.resolve(bare);
        } catch (UnknownHostException e) {
            throw ApiException.badRequest(NOT_VERIFIED);
        }
        if (addresses == null || addresses.length == 0) {
            throw ApiException.badRequest(NOT_VERIFIED);
        }
        for (InetAddress address : addresses) {
            if (!isPublic(address)) {
                throw ApiException.badRequest(NOT_VERIFIED);
            }
        }
    }

    static boolean isPublic(InetAddress a) {
        if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress()
                || a.isSiteLocalAddress() || a.isMulticastAddress()) {
            return false;
        }
        byte[] raw = a.getAddress();
        for (Cidr c : BLOCKED) {
            if (c.contains(raw)) {
                return false;
            }
        }
        return true;
    }

    // Không theo chuyển hướng: host công khai không được "bẻ lái" request sang địa chỉ khác sau khi đã qua kiểm tra.
    static SimpleClientHttpRequestFactory noRedirectRequestFactory(Duration connectTimeout, Duration readTimeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws IOException {
                super.prepareConnection(connection, httpMethod);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        return factory;
    }

    /** Mô tả lỗi gọi web con mà không lộ nội dung phản hồi hay ngoại lệ gốc (chi tiết chỉ nằm trong log). */
    static String describeFailure(Exception e) {
        if (e instanceof ApiException) {
            return e.getMessage();
        }
        if (e instanceof RestClientResponseException r) {
            int code = r.getStatusCode().value();
            return code == 401 || code == 403
                    ? "API key không khớp với web con (HTTP " + code + ")"
                    : "web con trả về lỗi HTTP " + code;
        }
        Throwable t = e;
        for (int depth = 0; t != null && depth < 10; depth++, t = t.getCause()) {
            if (t instanceof UnknownHostException) {
                return "không phân giải được tên miền của web con";
            }
            if (t instanceof SocketTimeoutException || t instanceof HttpTimeoutException) {
                return "web con không phản hồi kịp (hết thời gian chờ)";
            }
            if (t instanceof SSLException) {
                return "chứng chỉ HTTPS của web con không hợp lệ";
            }
            if (t instanceof ConnectException || t instanceof NoRouteToHostException) {
                return "không kết nối được tới web con";
            }
        }
        return "phản hồi từ web con không hợp lệ hoặc có lỗi khi gọi";
    }

    private record Cidr(byte[] network, int prefix) {

        static Cidr of(String literal, int prefix) {
            try {
                return new Cidr(InetAddress.getByName(literal).getAddress(), prefix);
            } catch (UnknownHostException e) {
                throw new IllegalStateException("CIDR không hợp lệ: " + literal, e);
            }
        }

        boolean contains(byte[] address) {
            if (address.length != network.length) {
                return false;
            }
            int fullBytes = prefix / 8;
            for (int i = 0; i < fullBytes; i++) {
                if (address[i] != network[i]) {
                    return false;
                }
            }
            int remainingBits = prefix % 8;
            if (remainingBits == 0) {
                return true;
            }
            int mask = (0xFF << (8 - remainingBits)) & 0xFF;
            return (address[fullBytes] & mask) == (network[fullBytes] & mask);
        }
    }
}
