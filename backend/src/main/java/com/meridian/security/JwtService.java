package com.meridian.security;

import com.meridian.config.MeridianProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * Phát hành và xác thực JWT (access + refresh) bằng HS256.
 */
@Service
public class JwtService {

    private static final String CLAIM_USERNAME = "username";
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_NAME = "name";
    private static final String CLAIM_TYPE = "type";

    private final SecretKey key;
    private final MeridianProperties.Jwt props;

    public JwtService(MeridianProperties properties) {
        this.props = properties.getJwt();
        byte[] secretBytes = props.getSecret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalStateException(
                    "meridian.jwt.secret phải có tối thiểu 32 ký tự (256-bit) cho HS256");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
    }

    public String generateAccessToken(UUID userId, String username, String email, String fullName) {
        return buildToken(userId, username, email, fullName, TokenType.ACCESS,
                props.getAccessTokenTtlSeconds());
    }

    public String generateRefreshToken(UUID userId, String username, String email, String fullName) {
        return buildToken(userId, username, email, fullName, TokenType.REFRESH,
                props.getRefreshTokenTtlSeconds());
    }

    public long getAccessTokenTtlSeconds() {
        return props.getAccessTokenTtlSeconds();
    }

    private String buildToken(UUID userId, String username, String email, String fullName,
            TokenType type, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(props.getIssuer())
                .subject(userId.toString())
                .claim(CLAIM_USERNAME, username)
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_NAME, fullName)
                .claim(CLAIM_TYPE, type.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key)
                .compact();
    }

    /**
     * Parse và xác thực token; ném {@link JwtException} nếu không hợp lệ/hết hạn.
     */
    public ParsedToken parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(props.getIssuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return new ParsedToken(
                UUID.fromString(claims.getSubject()),
                claims.get(CLAIM_USERNAME, String.class),
                claims.get(CLAIM_EMAIL, String.class),
                claims.get(CLAIM_NAME, String.class),
                TokenType.valueOf(claims.get(CLAIM_TYPE, String.class)));
    }

    public record ParsedToken(UUID userId, String username, String email, String fullName,
            TokenType type) {
    }
}
