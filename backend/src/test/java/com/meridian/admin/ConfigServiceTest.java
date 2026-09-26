package com.meridian.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.common.ApiException;
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

@ExtendWith(MockitoExtension.class)
class ConfigServiceTest {

    @Mock WebConfigurationRepository repository;
    @Mock PermissionService permissionService;

    private final UUID uid = UUID.randomUUID();

    private ConfigService service() {
        return new ConfigService(repository, permissionService);
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
}
