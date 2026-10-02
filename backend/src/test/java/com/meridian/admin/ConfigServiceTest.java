package com.meridian.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.common.ApiException;
import com.meridian.config.MeridianProperties;
import com.meridian.rbac.PermissionService;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class ConfigServiceTest {

    @Mock WebConfigurationRepository repository;
    @Mock PermissionService permissionService;

    private static final String UPLOADS = "https://api.school.vn";
    private static final String LOGO = UPLOADS + "/uploads/images/3f9c1b7e-52aa-4d0e-9b1e-0a6c7d2e8f11.png";

    private final UUID uid = UUID.randomUUID();

    private ConfigService service() {
        MeridianProperties properties = new MeridianProperties();
        properties.getUploads().setPublicBaseUrl(UPLOADS);
        return new ConfigService(repository, permissionService, properties, new ObjectMapper());
    }

    /** Lưu 1 khóa rồi trả về đúng giá trị đã ghi (sau khi chuẩn hóa). */
    private String saveAndGet(String key, String value) {
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.findAll()).thenReturn(List.of());
        service().update(uid, Map.of(key, value));
        ArgumentCaptor<WebConfiguration> saved = ArgumentCaptor.forClass(WebConfiguration.class);
        verify(repository).save(saved.capture());
        return saved.getValue().getValue();
    }

    @Test
    void savesValidColorsNormalizedToUpperCaseHex() {
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.findAll()).thenReturn(List.of());

        service().update(uid, Map.of("PRIMARY_COLOR", "  #1e3a5f ", "ACCENT_COLOR", "#c2691d",
                "BACKGROUND_COLOR", "#fff8e6"));

        ArgumentCaptor<WebConfiguration> saved = ArgumentCaptor.forClass(WebConfiguration.class);
        verify(repository, org.mockito.Mockito.times(3)).save(saved.capture());
        Map<String, String> byKey = new HashMap<>();
        saved.getAllValues().forEach(c -> byKey.put(c.getKey(), c.getValue()));
        assertThat(byKey).containsEntry("PRIMARY_COLOR", "#1E3A5F").containsEntry("ACCENT_COLOR", "#C2691D")
                .containsEntry("BACKGROUND_COLOR", "#FFF8E6");
    }

    @Test
    void backgroundColorIsValidatedLikeTheOtherColorsAndIsPublic() {
        assertThatThrownBy(() -> service().update(uid, Map.of("BACKGROUND_COLOR", "cream")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("BACKGROUND_COLOR");
        verify(repository, never()).save(any());

        WebConfiguration bg = new WebConfiguration();
        bg.setKey("BACKGROUND_COLOR");
        bg.setValue("#FBF8F3");
        WebConfiguration secret = new WebConfiguration();
        secret.setKey("SSL_FORCE_HTTPS");
        secret.setValue("false");
        when(repository.findAll()).thenReturn(List.of(bg, secret));
        assertThat(service().publicConfig()).containsEntry("BACKGROUND_COLOR", "#FBF8F3")
                .doesNotContainKey("SSL_FORCE_HTTPS");
    }

    /** Hai khóa chứa URL ảnh do admin tải lên, kiểm tra y hệt nhau. */
    private static final List<String> IMAGE_KEYS = List.of("SITE_LOGO_URL", "HOMEPAGE_HERO_IMAGE_URL");

    @Test
    void acceptsAnUploadedLogoOfThisSystemAndAnEmptyValueToRemoveIt() {
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.findAll()).thenReturn(List.of());

        service().update(uid, Map.of("SITE_LOGO_URL", "  " + LOGO + "  ", "SITE_LOGO_HIDE_NAME", " TRUE "));
        service().update(uid, Map.of("SITE_LOGO_URL", ""));

        ArgumentCaptor<WebConfiguration> saved = ArgumentCaptor.forClass(WebConfiguration.class);
        verify(repository, org.mockito.Mockito.times(3)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(WebConfiguration::getKey, WebConfiguration::getValue)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("SITE_LOGO_URL", LOGO),
                        org.assertj.core.groups.Tuple.tuple("SITE_LOGO_HIDE_NAME", "true"),
                        org.assertj.core.groups.Tuple.tuple("SITE_LOGO_URL", ""));
    }

    @Test
    void acceptsAnUploadedHeroImageOfThisSystemAndAnEmptyValueToRemoveIt() {
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.findAll()).thenReturn(List.of());
        String hero = UPLOADS + "/uploads/images/0b8e5c1a-77d3-4f1e-8a52-3c9d6e1f2a40.jpg";

        service().update(uid, Map.of("HOMEPAGE_HERO_IMAGE_URL", "  " + hero + " "));
        service().update(uid, Map.of("HOMEPAGE_HERO_IMAGE_URL", "   "));

        ArgumentCaptor<WebConfiguration> saved = ArgumentCaptor.forClass(WebConfiguration.class);
        verify(repository, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(WebConfiguration::getKey, WebConfiguration::getValue)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("HOMEPAGE_HERO_IMAGE_URL", hero),
                        org.assertj.core.groups.Tuple.tuple("HOMEPAGE_HERO_IMAGE_URL", ""));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://evil.example/uploads/images/a.png",
            "javascript:alert(1)",
            "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
            "https://api.school.vn.evil.example/uploads/images/a.png",
            "https://api.school.vn/uploads/audio/a.mp3",
            "https://api.school.vn/uploads/images/",
            "https://api.school.vn/uploads/images/../../application.properties",
            "https://api.school.vn/uploads/images/a.png?x=1",
            "https://api.school.vn/uploads/images/a b.png",
            "https://api.school.vn/uploads/images/a.png\"onerror=\"alert(1)",
            "/uploads/images/a.png"})
    void rejectsAnImageThatIsNotUploadedToThisSystem(String bad) {
        for (String key : IMAGE_KEYS) {
            assertThatThrownBy(() -> service().update(uid, Map.of(key, bad)))
                    .as(key)
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining(key);
        }
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"yes", "1", "", "  "})
    void logoHideNameFlagMustBeTrueOrFalse(String bad) {
        assertThatThrownBy(() -> service().update(uid, Map.of("SITE_LOGO_HIDE_NAME", bad)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("SITE_LOGO_HIDE_NAME");
        verify(repository, never()).save(any());
    }

    @Test
    void logoAndHeroImageSettingsArePublicSoEveryPageCanRenderThem() {
        WebConfiguration logo = new WebConfiguration();
        logo.setKey("SITE_LOGO_URL");
        logo.setValue(LOGO);
        WebConfiguration hideName = new WebConfiguration();
        hideName.setKey("SITE_LOGO_HIDE_NAME");
        hideName.setValue("false");
        WebConfiguration hero = new WebConfiguration();
        hero.setKey("HOMEPAGE_HERO_IMAGE_URL");
        hero.setValue(LOGO);
        when(repository.findAll()).thenReturn(List.of(logo, hideName, hero));

        assertThat(service().publicConfig())
                .containsEntry("SITE_LOGO_URL", LOGO)
                .containsEntry("SITE_LOGO_HIDE_NAME", "false")
                .containsEntry("HOMEPAGE_HERO_IMAGE_URL", LOGO);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "red", "1E3A5F", "#1E3", "#12345", "#1234567", "#GGGGGG", "#1E3A5FFF", "rgb(30, 58, 95)", "",
            "   ", "#1E3A5F; background:url(//evil.example/x)", "javascript:alert(1)", "#1E3A5F\n#000000"})
    void rejectsAnythingThatIsNotSixDigitHex(String bad) {
        assertThatThrownBy(() -> service().update(uid, Map.of("ACCENT_COLOR", bad)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("ACCENT_COLOR");
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsNullColorValue() {
        Map<String, String> updates = new HashMap<>();
        updates.put("PRIMARY_COLOR", null);
        assertThatThrownBy(() -> service().update(uid, updates)).isInstanceOf(ApiException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void oneBadColorPreventsEveryOtherKeyFromBeingSaved() {
        Map<String, String> updates = new LinkedHashMap<>();
        updates.put("SITE_NAME", "Sunshine School");
        updates.put("PRIMARY_COLOR", "not-a-color");

        assertThatThrownBy(() -> service().update(uid, updates)).isInstanceOf(ApiException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void otherKeysAreStoredUntouched() {
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.findAll()).thenReturn(List.of());

        service().update(uid, Map.of("SITE_NAME", "  Sunshine School  ", "SUPPORT_EMAIL", "a@b.vn"));

        ArgumentCaptor<WebConfiguration> saved = ArgumentCaptor.forClass(WebConfiguration.class);
        verify(repository, org.mockito.Mockito.times(2)).save(saved.capture());
        Map<String, String> byKey = new HashMap<>();
        saved.getAllValues().forEach(c -> byKey.put(c.getKey(), c.getValue()));
        assertThat(byKey).containsEntry("SITE_NAME", "  Sunshine School  ").containsEntry("SUPPORT_EMAIL", "a@b.vn");
    }

    // ------------------------------------------------------------------------------------------------
    // Nội dung trang chủ / liên hệ có thể sửa: con số nổi bật, nhãn, điện thoại, địa chỉ, lời chứng thực
    // ------------------------------------------------------------------------------------------------

    /** Khóa → số ký tự tối đa (khớp SHORT_TEXT_LIMITS trong ConfigService). */
    private static final Map<String, Integer> SHORT_TEXT_LIMITS = Map.of(
            "HOMEPAGE_HIGHLIGHT_VALUE", 12,
            "HOMEPAGE_HIGHLIGHT_LABEL", 40,
            "HOMEPAGE_TEACHERS_LABEL", 40,
            "SUPPORT_PHONE", 40,
            "SUPPORT_ADDRESS", 200);

    @Test
    void shortHomepageTextsAreTrimmedAndAcceptExactlyTheLimit() {
        SHORT_TEXT_LIMITS.forEach((key, limit) -> {
            org.mockito.Mockito.clearInvocations(repository);
            assertThat(saveAndGet(key, "  " + "x".repeat(limit) + "  ")).as(key).isEqualTo("x".repeat(limit));
        });
    }

    @Test
    void shortHomepageTextsCanBeEmptiedToHideThem() {
        for (String key : SHORT_TEXT_LIMITS.keySet()) {
            org.mockito.Mockito.clearInvocations(repository);
            assertThat(saveAndGet(key, "   ")).as(key).isEmpty();
        }
    }

    @Test
    void shortHomepageTextsOverTheLimitAreRejected() {
        SHORT_TEXT_LIMITS.forEach((key, limit) ->
                assertThatThrownBy(() -> service().update(uid, Map.of(key, "x".repeat(limit + 1))))
                        .as(key)
                        .isInstanceOf(ApiException.class)
                        .hasMessageContaining(key));
        verify(repository, never()).save(any());
    }

    @Test
    void testimonialsAreNormalizedToCompactJsonKeepingOnlyKnownFields() {
        String saved = saveAndGet("HOMEPAGE_TESTIMONIALS", """
                [ {"name": "  Hoàng Anh ", "band": " 7.5", "text": "  Rất tốt  ", "extra": "bị bỏ"},
                  {"text": "Không tên, không band"} ]
                """);

        assertThat(saved).isEqualTo(
                "[{\"name\":\"Hoàng Anh\",\"band\":\"7.5\",\"text\":\"Rất tốt\"},"
                        + "{\"name\":\"\",\"band\":\"\",\"text\":\"Không tên, không band\"}]");
    }

    @Test
    void emptyTestimonialsValueMeansNoTestimonialsAtAll() {
        for (String empty : List.of("", "   ", "[]", " [ ] ")) {
            org.mockito.Mockito.clearInvocations(repository);
            assertThat(saveAndGet("HOMEPAGE_TESTIMONIALS", empty)).as("'" + empty + "'").isEqualTo("[]");
        }
    }

    @Test
    void testimonialsAtTheLimitsAreAccepted() {
        String item = "{\"name\":\"" + "n".repeat(80) + "\",\"band\":\"" + "b".repeat(10) + "\",\"text\":\""
                + "t".repeat(600) + "\"}";
        String twelve = "[" + String.join(",", java.util.Collections.nCopies(12, item)) + "]";

        assertThat(saveAndGet("HOMEPAGE_TESTIMONIALS", twelve)).isEqualTo(twelve);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "not json at all",
            "{\"name\":\"x\",\"text\":\"y\"}",
            "\"just a string\"",
            "42",
            "[1]",
            "[\"text\"]",
            "[null]",
            "[{\"name\":\"x\"}]",
            "[{\"name\":\"x\",\"text\":\"\"}]",
            "[{\"name\":\"x\",\"text\":\"   \"}]",
            "[{\"name\":\"x\",\"text\":null}]",
            "[{\"name\":\"x\",\"text\":5}]",
            "[{\"name\":{\"a\":1},\"text\":\"y\"}]",
            "[{\"name\":7,\"text\":\"y\"}]",
            "[{\"band\":7.5,\"text\":\"y\"}]",
            "[{\"text\":[\"y\"]}]"})
    void malformedTestimonialsAreRejectedAndNothingIsSaved(String bad) {
        assertThatThrownBy(() -> service().update(uid, Map.of("HOMEPAGE_TESTIMONIALS", bad)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("HOMEPAGE_TESTIMONIALS");
        verify(repository, never()).save(any());
    }

    @Test
    void testimonialsOverTheLimitsAreRejected() {
        String tooMany = "[" + String.join(",", java.util.Collections.nCopies(13, "{\"text\":\"ok\"}")) + "]";
        List<String> bad = List.of(
                tooMany,
                "[{\"name\":\"" + "n".repeat(81) + "\",\"text\":\"ok\"}]",
                "[{\"band\":\"" + "b".repeat(11) + "\",\"text\":\"ok\"}]",
                "[{\"text\":\"" + "t".repeat(601) + "\"}]");

        for (String value : bad) {
            assertThatThrownBy(() -> service().update(uid, Map.of("HOMEPAGE_TESTIMONIALS", value)))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("HOMEPAGE_TESTIMONIALS");
        }
        verify(repository, never()).save(any());
    }

    @Test
    void oneBadTestimonialPreventsEveryOtherKeyFromBeingSaved() {
        Map<String, String> updates = new LinkedHashMap<>();
        updates.put("HOMEPAGE_HIGHLIGHT_VALUE", "95%");
        updates.put("HOMEPAGE_TESTIMONIALS", "[{\"name\":\"x\"}]");

        assertThatThrownBy(() -> service().update(uid, updates)).isInstanceOf(ApiException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void homepageContentAndContactDetailsArePublic() {
        List<WebConfiguration> all = new java.util.ArrayList<>();
        for (String key : List.of("HOMEPAGE_HIGHLIGHT_VALUE", "HOMEPAGE_HIGHLIGHT_LABEL", "HOMEPAGE_TEACHERS_LABEL",
                "HOMEPAGE_TESTIMONIALS", "SUPPORT_PHONE", "SUPPORT_ADDRESS")) {
            WebConfiguration c = new WebConfiguration();
            c.setKey(key);
            c.setValue("v");
            all.add(c);
        }
        WebConfiguration secret = new WebConfiguration();
        secret.setKey("CACHE_TTL");
        secret.setValue("300");
        all.add(secret);
        when(repository.findAll()).thenReturn(all);

        assertThat(service().publicConfig()).containsOnlyKeys("HOMEPAGE_HIGHLIGHT_VALUE", "HOMEPAGE_HIGHLIGHT_LABEL",
                "HOMEPAGE_TEACHERS_LABEL", "HOMEPAGE_TESTIMONIALS", "SUPPORT_PHONE", "SUPPORT_ADDRESS");
    }
}
