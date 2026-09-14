package com.meridian.distribution;

import com.meridian.distribution.dto.RbacSyncDtos.SyncAccountDto;
import com.meridian.distribution.dto.RbacSyncDtos.SyncCourseGrantDto;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Web tổng xem/sửa role + quyền lẻ theo khóa của tài khoản ĐANG TỒN TẠI ở
 * một web con cụ thể — gate bằng {@code childsite:manage-accounts} (V49),
 * tách khỏi {@code course:distribute}. Thực thi qua {@link RemoteAccountService}
 * (gọi HTTP sang đúng web con bằng API key của web con đó).
 */
@RestController
@RequestMapping("/api/admin/child-sites/{siteId}/accounts")
public class RemoteAccountController {

    private final RemoteAccountService service;
    private final CurrentUserProvider currentUser;

    public RemoteAccountController(RemoteAccountService service, CurrentUserProvider currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    public record AssignRoleBody(@NotBlank String roleShortname) {
    }

    public record SetCourseGrantsBody(@NotBlank String courseShortname, @NotNull List<String> capabilities) {
    }

    @GetMapping
    public List<SyncAccountDto> list(@PathVariable Long siteId, @RequestParam(required = false) String search) {
        return service.listAccounts(uid(), siteId, search);
    }

    @GetMapping("/{userId}/course-grants")
    public List<SyncCourseGrantDto> courseGrants(@PathVariable Long siteId, @PathVariable UUID userId) {
        return service.listCourseGrants(uid(), siteId, userId);
    }

    @PostMapping("/{userId}/roles")
    public ResponseEntity<Void> assignRole(@PathVariable Long siteId, @PathVariable UUID userId,
            @Valid @RequestBody AssignRoleBody body) {
        service.assignRole(uid(), siteId, userId, body.roleShortname());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}/roles/{roleShortname}")
    public ResponseEntity<Void> revokeRole(@PathVariable Long siteId, @PathVariable UUID userId,
            @PathVariable String roleShortname) {
        service.revokeRole(uid(), siteId, userId, roleShortname);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{userId}/course-grants")
    public ResponseEntity<Void> setCourseGrants(@PathVariable Long siteId, @PathVariable UUID userId,
            @Valid @RequestBody SetCourseGrantsBody body) {
        service.setCourseGrants(uid(), siteId, userId, body.courseShortname(), body.capabilities());
        return ResponseEntity.noContent().build();
    }
}
