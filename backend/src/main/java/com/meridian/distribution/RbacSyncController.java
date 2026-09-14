package com.meridian.distribution;

import com.meridian.distribution.dto.RbacSyncDtos.AssignRoleSyncRequest;
import com.meridian.distribution.dto.RbacSyncDtos.SetCourseGrantsSyncRequest;
import com.meridian.distribution.dto.RbacSyncDtos.SyncAccountDto;
import com.meridian.distribution.dto.RbacSyncDtos.SyncCourseGrantDto;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
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
 * Nhận yêu cầu xem/sửa role + quyền lẻ theo khóa của tài khoản ở WEB CON này
 * — chỉ web tổng gọi, xác thực bằng API key (header X-Meridian-Api-Key, xem
 * {@link CourseImportApiKeyFilter}), không qua JWT người dùng — cùng mô hình
 * xác thực với {@link CourseImportController}.
 */
@RestController
@RequestMapping("/api/rbac-sync")
public class RbacSyncController {

    private final RbacSyncService service;

    public RbacSyncController(RbacSyncService service) {
        this.service = service;
    }

    @GetMapping("/accounts")
    public List<SyncAccountDto> accounts(@RequestParam(required = false) String search) {
        return service.listAccounts(search);
    }

    @GetMapping("/accounts/{userId}/course-grants")
    public List<SyncCourseGrantDto> courseGrants(@PathVariable UUID userId) {
        return service.listCourseGrants(userId);
    }

    @PostMapping("/accounts/roles")
    public ResponseEntity<Void> assignRole(@Valid @RequestBody AssignRoleSyncRequest req) {
        service.assignRole(req.userId(), req.roleShortname());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/accounts/{userId}/roles/{roleShortname}")
    public ResponseEntity<Void> revokeRole(@PathVariable UUID userId, @PathVariable String roleShortname) {
        service.revokeRole(userId, roleShortname);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/accounts/{userId}/course-grants")
    public ResponseEntity<Void> setCourseGrants(@PathVariable UUID userId,
            @Valid @RequestBody SetCourseGrantsSyncRequest req) {
        service.setCourseGrants(userId, req.courseShortname(), req.capabilities());
        return ResponseEntity.noContent().build();
    }
}
