package com.meridian.distribution;

import com.meridian.common.ApiException;
import com.meridian.distribution.dto.CourseBundle;
import com.meridian.distribution.dto.CourseDistributionDtos.DistributeResultDto;
import com.meridian.rbac.PermissionService;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** Đẩy 1 khóa học (bản sao độc lập) từ web tổng sang các web con đã đăng ký, gate bằng course:distribute. */
@Service
public class CourseDistributionService {

    private static final String CAP = "course:distribute";

    private final ChildSiteRepository childSiteRepository;
    private final CourseExportService exportService;
    private final PermissionService permissionService;
    private final RestClient restClient;

    public CourseDistributionService(ChildSiteRepository childSiteRepository, CourseExportService exportService,
            PermissionService permissionService) {
        this.childSiteRepository = childSiteRepository;
        this.exportService = exportService;
        this.permissionService = permissionService;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.restClient = RestClient.builder().requestFactory(factory).build();
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
            return new DistributeResultDto(siteId, null, false, "Không tìm thấy web con");
        }
        if (!site.isActive()) {
            return new DistributeResultDto(siteId, site.getName(), false, "Web con đang tạm dừng");
        }
        try {
            restClient.post()
                    .uri(site.getBaseUrl() + "/api/catalog/import")
                    .header("X-Meridian-Api-Key", site.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(manifest)
                    .retrieve()
                    .toBodilessEntity();
            return new DistributeResultDto(siteId, site.getName(), true, null);
        } catch (Exception e) {
            return new DistributeResultDto(siteId, site.getName(), false, e.getMessage());
        }
    }
}
