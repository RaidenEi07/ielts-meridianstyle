package com.meridian.distribution;

import com.meridian.common.ApiException;
import com.meridian.distribution.dto.CourseBundle;
import com.meridian.distribution.dto.CourseDistributionDtos.DistributeResultDto;
import com.meridian.distribution.dto.CourseImportSummaryDto;
import com.meridian.rbac.PermissionService;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** Đẩy 1 khóa học (bản sao độc lập) từ web tổng sang các web con đã đăng ký, gate bằng course:distribute. */
@Service
public class CourseDistributionService {

    private static final Logger log = LoggerFactory.getLogger(CourseDistributionService.class);
    private static final String CAP = "course:distribute";

    private final ChildSiteRepository childSiteRepository;
    private final CourseExportService exportService;
    private final PermissionService permissionService;
    private final ChildSiteUrlGuard urlGuard;
    private final RestClient restClient;

    public CourseDistributionService(ChildSiteRepository childSiteRepository, CourseExportService exportService,
            PermissionService permissionService, ChildSiteUrlGuard urlGuard) {
        this.childSiteRepository = childSiteRepository;
        this.exportService = exportService;
        this.permissionService = permissionService;
        this.urlGuard = urlGuard;

        // Đọc timeout ngắn (15s cũ) khiến khóa học lớn (vd ielts-prep, ~1800 câu
        // hỏi) luôn báo "thất bại" (SocketTimeoutException) trên web tổng dù
        // web con vẫn âm thầm nhập xong đúng ở phía sau — mỗi câu hỏi/quiz_question
        // là 1-2 lượt ghi DB tuần tự bên web con nên tổng thời gian dễ vượt xa
        // 15s với khóa học nhiều câu hỏi. Nới lên vài phút vì đây là thao tác quản
        // trị không thường xuyên, không nhạy độ trễ như request người dùng cuối.
        this.restClient = RestClient.builder()
                .requestFactory(ChildSiteUrlGuard.noRedirectRequestFactory(
                        Duration.ofSeconds(10), Duration.ofMinutes(10)))
                .build();
    }

    public List<DistributeResultDto> distribute(UUID userId, Long courseId, List<Long> childSiteIds) {
        permissionService.requireSystemCapability(userId, CAP);
        if (childSiteIds == null || childSiteIds.isEmpty()) {
            throw ApiException.badRequest("Chưa chọn web con nào để gửi");
        }
        CourseBundle.Manifest manifest = exportService.exportCourse(courseId);

        List<DistributeResultDto> results = new ArrayList<>();
        for (Long siteId : childSiteIds) {
            results.add(sendTo(siteId, manifest));
        }
        return results;
    }

    private DistributeResultDto sendTo(Long siteId, CourseBundle.Manifest manifest) {
        ChildSite site = childSiteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new DistributeResultDto(siteId, null, false, "Không tìm thấy web con", List.of());
        }
        if (!site.isActive()) {
            return new DistributeResultDto(siteId, site.getName(), false, "Web con đang tạm dừng", List.of());
        }
        try {
            String baseUrl = urlGuard.requireSafeBaseUrl(site.getBaseUrl());
            CourseImportSummaryDto summary = restClient.post()
                    .uri(baseUrl + "/api/catalog/import")
                    .header("X-Meridian-Api-Key", site.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(manifest)
                    .retrieve()
                    .body(CourseImportSummaryDto.class);
            List<String> warnings = summary != null ? summary.warnings() : List.of();
            return new DistributeResultDto(siteId, site.getName(), true, null, warnings);
        } catch (Exception e) {
            log.warn("Gửi khóa học tới web con id={} thất bại", siteId, e);
            return new DistributeResultDto(siteId, site.getName(), false,
                    "Gửi thất bại: " + ChildSiteUrlGuard.describeFailure(e), List.of());
        }
    }
}
