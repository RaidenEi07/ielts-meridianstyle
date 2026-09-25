package com.meridian.distribution;

import com.meridian.common.ApiException;
import com.meridian.distribution.dto.RbacSyncDtos.AssignRoleSyncRequest;
import com.meridian.distribution.dto.RbacSyncDtos.SetCourseGrantsSyncRequest;
import com.meridian.distribution.dto.RbacSyncDtos.SyncAccountDto;
import com.meridian.distribution.dto.RbacSyncDtos.SyncCourseGrantDto;
import com.meridian.rbac.PermissionService;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Phía GỬI (web tổng) của tính năng "web tổng điều khiển role/quyền tài
 * khoản web con" — gọi sang đúng {@link RbacSyncController} của web con qua
 * API key riêng của web con đó, cùng mô hình xác thực với
 * {@link CourseDistributionService} (đẩy nội dung khóa học). Tách riêng
 * capability {@code childsite:manage-accounts} khỏi {@code course:distribute}
 * (xem V49) — có thể cấp quyền đẩy nội dung mà KHÔNG cấp quyền sửa tài
 * khoản người khác ở web con, vì đây là hành động nhạy cảm hơn.
 */
@Service
public class RemoteAccountService {

    private static final Logger log = LoggerFactory.getLogger(RemoteAccountService.class);
    private static final String CAP = "childsite:manage-accounts";

    private final ChildSiteRepository childSiteRepository;
    private final PermissionService permissionService;
    private final ChildSiteUrlGuard urlGuard;
    private final RestClient restClient;

    public RemoteAccountService(ChildSiteRepository childSiteRepository, PermissionService permissionService,
            ChildSiteUrlGuard urlGuard) {
        this.childSiteRepository = childSiteRepository;
        this.permissionService = permissionService;
        this.urlGuard = urlGuard;
        this.restClient = RestClient.builder()
                .requestFactory(ChildSiteUrlGuard.noRedirectRequestFactory(
                        Duration.ofSeconds(10), Duration.ofSeconds(30)))
                .build();
    }

    public List<SyncAccountDto> listAccounts(UUID uid, Long childSiteId, String search) {
        permissionService.requireSystemCapability(uid, CAP);
        ChildSite site = requireSite(childSiteId);
        String url = urlGuard.requireSafeBaseUrl(site.getBaseUrl()) + "/api/rbac-sync/accounts"
                + (search != null && !search.isBlank() ? "?search=" + search : "");
        try {
            SyncAccountDto[] result = restClient.get().uri(url)
                    .header("X-Meridian-Api-Key", site.getApiKey())
                    .retrieve().body(SyncAccountDto[].class);
            return result != null ? List.of(result) : List.of();
        } catch (Exception e) {
            throw connectError(site, e);
        }
    }

    public List<SyncCourseGrantDto> listCourseGrants(UUID uid, Long childSiteId, UUID targetUserId) {
        permissionService.requireSystemCapability(uid, CAP);
        ChildSite site = requireSite(childSiteId);
        String url = urlGuard.requireSafeBaseUrl(site.getBaseUrl())
                + "/api/rbac-sync/accounts/" + targetUserId + "/course-grants";
        try {
            SyncCourseGrantDto[] result = restClient.get().uri(url)
                    .header("X-Meridian-Api-Key", site.getApiKey())
                    .retrieve().body(SyncCourseGrantDto[].class);
            return result != null ? List.of(result) : List.of();
        } catch (Exception e) {
            throw connectError(site, e);
        }
    }

    public void assignRole(UUID uid, Long childSiteId, UUID targetUserId, String roleShortname) {
        permissionService.requireSystemCapability(uid, CAP);
        ChildSite site = requireSite(childSiteId);
        String url = urlGuard.requireSafeBaseUrl(site.getBaseUrl()) + "/api/rbac-sync/accounts/roles";
        try {
            restClient.post().uri(url)
                    .header("X-Meridian-Api-Key", site.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new AssignRoleSyncRequest(targetUserId, roleShortname))
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            throw connectError(site, e);
        }
    }

    public void revokeRole(UUID uid, Long childSiteId, UUID targetUserId, String roleShortname) {
        permissionService.requireSystemCapability(uid, CAP);
        ChildSite site = requireSite(childSiteId);
        String url = urlGuard.requireSafeBaseUrl(site.getBaseUrl())
                + "/api/rbac-sync/accounts/" + targetUserId + "/roles/" + roleShortname;
        try {
            restClient.delete().uri(url)
                    .header("X-Meridian-Api-Key", site.getApiKey())
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            throw connectError(site, e);
        }
    }

    public void setCourseGrants(UUID uid, Long childSiteId, UUID targetUserId,
            String courseShortname, List<String> capabilities) {
        permissionService.requireSystemCapability(uid, CAP);
        ChildSite site = requireSite(childSiteId);
        String url = urlGuard.requireSafeBaseUrl(site.getBaseUrl())
                + "/api/rbac-sync/accounts/" + targetUserId + "/course-grants";
        try {
            restClient.put().uri(url)
                    .header("X-Meridian-Api-Key", site.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new SetCourseGrantsSyncRequest(courseShortname, capabilities))
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            throw connectError(site, e);
        }
    }

    private ChildSite requireSite(Long id) {
        return childSiteRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy web con"));
    }

    private ApiException connectError(ChildSite site, Exception e) {
        log.warn("Gọi web con id={} thất bại", site.getId(), e);
        return ApiException.badRequest(
                "Không kết nối được web con \"" + site.getName() + "\": " + ChildSiteUrlGuard.describeFailure(e));
    }
}
