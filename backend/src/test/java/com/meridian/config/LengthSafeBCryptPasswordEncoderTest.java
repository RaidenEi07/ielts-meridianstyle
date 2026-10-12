package com.meridian.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.meridian.common.ApiException;
import org.junit.jupiter.api.Test;

class LengthSafeBCryptPasswordEncoderTest {

    private final LengthSafeBCryptPasswordEncoder encoder = new LengthSafeBCryptPasswordEncoder();

    @Test
    void normalPasswordRoundTrips() {
        String hash = encoder.encode("Matkhau@123");
        assertThat(encoder.matches("Matkhau@123", hash)).isTrue();
        assertThat(encoder.matches("sai", hash)).isFalse();
    }

    @Test
    void exactly72BytesIsAccepted() {
        String raw = "a".repeat(72);
        assertThat(encoder.matches(raw, encoder.encode(raw))).isTrue();
    }

    @Test
    void passwordOver72BytesIsRejectedWithABadRequestNotAnIllegalArgument() {
        // 40 chữ có dấu = 80 byte UTF-8 dù mới 40 ký tự.
        String raw = "ệ".repeat(40);
        assertThat(raw.length()).isEqualTo(40);
        assertThatThrownBy(() -> encoder.encode(raw)).isInstanceOf(ApiException.class)
                .hasMessageContaining("quá dài");
    }

    @Test
    void loginWithAnOverlongStringJustDoesNotMatch() {
        String hash = encoder.encode("Matkhau@123");
        assertThat(encoder.matches("ệ".repeat(40), hash)).isFalse();
    }
}
