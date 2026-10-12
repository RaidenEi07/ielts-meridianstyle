package com.meridian.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.common.ApiException;
import com.meridian.config.MeridianProperties;
import com.meridian.rbac.PermissionService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

/**
 * Web con không được hiện công khai nội dung mẫu của web tổng (email Meridian, "92%", lời chứng thực mặc định);
 * web tổng thì giữ nguyên. Cùng bộ test cho 2 khóa văn bản Điều khoản/Chính sách do trung tâm tự soạn.
 */
@ExtendWith(MockitoExtension.class)
class ConfigServiceFactoryContentTest {

    @Mock WebConfigurationRepository repository;
    @Mock PermissionService permissionService;

    private static final String SAMPLE_TESTIMONIALS =
            "[{\"name\":\"Hoàng Anh\",\"band\":\"7.5\",\"text\":\"Mô phỏng phòng thi máy giống thi thật đến từng chi tiết. "
                    + "Mình vào phòng thi không hề bỡ ngỡ.\"},"
                    + "{\"name\":\"Thùy Dung\",\"band\":\"8.0\",\"text\":\"Giáo viên tận tâm, lộ trình rõ ràng. "
                    + "Từ 6.0 lên 8.0 chỉ sau một khóa học.\"},"
                    + "{\"name\":\"Minh Quân\",\"band\":\"7.0\",\"text\":\"Ngân hàng đề phong phú, chấm tự động nhanh. "
                    + "Biết ngay điểm yếu để cải thiện.\"}]";

    private final UUID uid = UUID.randomUUID();

    private ConfigService service(boolean master) {
        MeridianProperties properties = new MeridianProperties();
        properties.setSiteRole(master ? "MASTER" : "CHILD");
        return new ConfigService(repository, permissionService, properties, new ObjectMapper());
    }

    private static WebConfiguration row(String key, String value) {
        WebConfiguration c = new WebConfiguration();
        c.setKey(key);
        c.setValue(value);
        return c;
    }

    private List<WebConfiguration> factoryRows() {
        return new ArrayList<>(List.of(
                row("SUPPORT_EMAIL", "lienhe@meridian.edu.vn"),
                row("SUPPORT_ADDRESS", "Hà Nội · TP.HCM"),
                row("SUPPORT_PHONE", ""),
                row("HOMEPAGE_HIGHLIGHT_VALUE", "92%"),
                row("HOMEPAGE_HIGHLIGHT_LABEL", "Đạt mục tiêu"),
                row("HOMEPAGE_TEACHERS_LABEL", "Giáo viên IELTS 8.0+"),
                row("HOMEPAGE_TESTIMONIALS", SAMPLE_TESTIMONIALS),
                row("SITE_NAME", "Sunshine School")));
    }

    @Test
    void childSiteHidesFactorySampleContentFromThePublic() {
        when(repository.findAll()).thenReturn(factoryRows());

        Map<String, String> pub = service(false).publicConfig();

        assertThat(pub).containsEntry("SUPPORT_EMAIL", "")
                .containsEntry("SUPPORT_ADDRESS", "")
                .containsEntry("HOMEPAGE_HIGHLIGHT_VALUE", "")
                .containsEntry("HOMEPAGE_HIGHLIGHT_LABEL", "")
                .containsEntry("HOMEPAGE_TEACHERS_LABEL", "")
                .containsEntry("HOMEPAGE_TESTIMONIALS", "[]")
                .containsEntry("SITE_NAME", "Sunshine School");
    }

    @Test
    void masterSiteKeepsItsOwnContent() {
        when(repository.findAll()).thenReturn(factoryRows());

        Map<String, String> pub = service(true).publicConfig();

        assertThat(pub).containsEntry("SUPPORT_EMAIL", "lienhe@meridian.edu.vn")
                .containsEntry("HOMEPAGE_HIGHLIGHT_VALUE", "92%")
                .containsEntry("HOMEPAGE_TESTIMONIALS", SAMPLE_TESTIMONIALS);
    }

    @Test
    void realValuesTheAdminEnteredAreShownOnAChildSite() {
        List<WebConfiguration> rows = List.of(
                row("SUPPORT_EMAIL", "tuyensinh@sunshineschool.edu.vn"),
                row("SUPPORT_ADDRESS", "12 Nguyễn Trãi, Hà Nội"),
                row("HOMEPAGE_HIGHLIGHT_VALUE", "87%"),
                row("HOMEPAGE_TESTIMONIALS", "[{\"name\":\"Lan\",\"band\":\"7.0\",\"text\":\"Cô dạy rất tận tình.\"}]"));
        when(repository.findAll()).thenReturn(rows);

        Map<String, String> pub = service(false).publicConfig();

        assertThat(pub).containsEntry("SUPPORT_EMAIL", "tuyensinh@sunshineschool.edu.vn")
                .containsEntry("SUPPORT_ADDRESS", "12 Nguyễn Trãi, Hà Nội")
                .containsEntry("HOMEPAGE_HIGHLIGHT_VALUE", "87%")
                .containsEntry("HOMEPAGE_TESTIMONIALS",
                        "[{\"name\":\"Lan\",\"band\":\"7.0\",\"text\":\"Cô dạy rất tận tình.\"}]");
    }

    @Test
    void aRealTestimonialAmongTheSamplesKeepsTheListVisible() {
        String mixed = "[{\"name\":\"Hoàng Anh\",\"band\":\"7.5\",\"text\":\"Mô phỏng phòng thi máy giống thi thật "
                + "đến từng chi tiết. Mình vào phòng thi không hề bỡ ngỡ.\"},"
                + "{\"name\":\"Lan\",\"band\":\"7.0\",\"text\":\"Cô dạy rất tận tình.\"}]";
        when(repository.findAll()).thenReturn(List.of(row("HOMEPAGE_TESTIMONIALS", mixed)));

        assertThat(service(false).publicConfig()).containsEntry("HOMEPAGE_TESTIMONIALS", mixed);
    }

    @Test
    void aSubsetOfTheSampleTestimonialsIsStillHidden() {
        String subset = "[{\"name\":\"Minh Quân\",\"band\":\"7.0\",\"text\":\"Ngân hàng đề phong phú, chấm tự động "
                + "nhanh. Biết ngay điểm yếu để cải thiện.\"}]";
        when(repository.findAll()).thenReturn(List.of(row("HOMEPAGE_TESTIMONIALS", subset)));

        assertThat(service(false).publicConfig()).containsEntry("HOMEPAGE_TESTIMONIALS", "[]");
    }

    @Test
    void garbageInTestimonialsDoesNotBreakTheEndpoint() {
        when(repository.findAll()).thenReturn(List.of(row("HOMEPAGE_TESTIMONIALS", "not json")));

        assertThat(service(false).publicConfig()).containsEntry("HOMEPAGE_TESTIMONIALS", "not json");
    }

    @Test
    void adminSettingsFormShowsTheSameBlanksAsThePublic() {
        when(repository.findAll()).thenReturn(factoryRows());

        Map<String, String> all = service(false).allConfig(uid);

        assertThat(all).containsEntry("SUPPORT_EMAIL", "").containsEntry("HOMEPAGE_HIGHLIGHT_VALUE", "");
    }

    // ---- Văn bản Điều khoản / Chính sách do trung tâm soạn ----

    private String saveAndGet(String key, String value) {
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.findAll()).thenReturn(List.of());
        service(false).update(uid, Map.of(key, value));
        ArgumentCaptor<WebConfiguration> saved = ArgumentCaptor.forClass(WebConfiguration.class);
        verify(repository).save(saved.capture());
        return saved.getValue().getValue();
    }

    @Test
    void legalTextIsPublicAndNormalized() {
        assertThat(saveAndGet("LEGAL_TERMS_TEXT", "  Điều 1\r\nNội dung\r\n\r\nĐiều 2\u0000\u0007  "))
                .isEqualTo("Điều 1\nNội dung\n\nĐiều 2");

        WebConfiguration terms = row("LEGAL_TERMS_TEXT", "Điều 1");
        WebConfiguration privacy = row("LEGAL_PRIVACY_TEXT", "Bảo mật");
        when(repository.findAll()).thenReturn(List.of(terms, privacy));
        assertThat(service(false).publicConfig()).containsEntry("LEGAL_TERMS_TEXT", "Điều 1")
                .containsEntry("LEGAL_PRIVACY_TEXT", "Bảo mật");
    }

    @Test
    void legalTextCanBeClearedAndIsLengthLimited() {
        assertThat(saveAndGet("LEGAL_PRIVACY_TEXT", "   ")).isEmpty();
        assertThatThrownBy(() -> service(false).update(uid, Map.of("LEGAL_PRIVACY_TEXT", "x".repeat(20_001))))
                .isInstanceOf(ApiException.class).hasMessageContaining("LEGAL_PRIVACY_TEXT");
    }
}
