package com.meridian.rbac;

import com.meridian.auth.dto.RoleAssignmentDto;
import com.meridian.common.ApiException;
import com.meridian.rbac.dto.AdminUserDto;
import com.meridian.rbac.dto.AssignRoleRequest;
import com.meridian.rbac.dto.CapabilityDto;
import com.meridian.rbac.dto.CreateUserRequest;
import com.meridian.rbac.dto.RoleDto;
import com.meridian.rbac.dto.SetCourseGrantsRequest;
import com.meridian.rbac.dto.UpdateUserRequest;
import com.meridian.rbac.dto.UserCourseGrantDto;
import com.meridian.security.AuthenticatedUser;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint quản trị RBAC. Mỗi handler kiểm tra capability tại SYSTEM context
 * của user hiện tại trước khi thực thi.
 */
@RestController
@RequestMapping("/api/admin")
public class RbacController {

    private final RbacService rbacService;
    private final CurrentUserProvider currentUserProvider;
    private final PermissionService permissionService;

    public RbacController(RbacService rbacService,
            CurrentUserProvider currentUserProvider,
            PermissionService permissionService) {
        this.rbacService = rbacService;
        this.currentUserProvider = currentUserProvider;
        this.permissionService = permissionService;
    }

    /** Đọc danh sách user — cho cả 'user:manage' (admin) lẫn 'enrollment:manage'
     * (manager, V41): manager cần duyệt danh sách học sinh/giáo viên để chọn
     * ghi danh/gán roster, dù không có quyền tạo/sửa tài khoản hay gán role. */
    @GetMapping("/users")
    public List<AdminUserDto> listUsers(@RequestParam(required = false) String search) {
        UUID uid = currentUserProvider.require().id();
        boolean allowed = permissionService.hasSystemCapability(uid, "user:manage")
                || permissionService.hasSystemCapability(uid, "enrollment:manage");
        if (!allowed) {
            throw ApiException.forbidden("Thiếu quyền 'user:manage'");
        }
        return rbacService.listUsers(search);
    }

    @PostMapping("/users")
    public ResponseEntity<AdminUserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        requireSystem("user:manage");
        return ResponseEntity.status(HttpStatus.CREATED).body(rbacService.createUser(request));
    }

    @PatchMapping("/users/{id}")
    public AdminUserDto updateUser(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        requireSystem("user:manage");
        return rbacService.updateUser(id, request);
    }

    @GetMapping("/roles")
    public List<RoleDto> listRoles() {
        requireSystem("role:assign");
        return rbacService.listRoles();
    }

    @GetMapping("/capabilities")
    public List<CapabilityDto> listCapabilities() {
        requireSystem("role:assign");
        return rbacService.listCapabilitiesDetailed();
    }

    @PostMapping("/role-assignments")
    public ResponseEntity<RoleAssignmentDto> assignRole(
            @Valid @RequestBody AssignRoleRequest request) {
        requireSystem("role:assign");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(rbacService.assignRole(request));
    }

    @DeleteMapping("/role-assignments/{id}")
    public ResponseEntity<Void> revoke(@PathVariable Long id) {
        requireSystem("role:assign");
        rbacService.revokeAssignment(id);
        return ResponseEntity.noContent().build();
    }

    /** Quyền lẻ theo khóa học (không qua role) — cùng mức nhạy cảm với gán
     * role nên dùng chung guard 'role:assign'. Xem UserCapabilityGrant/V47. */
    @GetMapping("/users/{id}/course-grants")
    public List<UserCourseGrantDto> listCourseGrants(@PathVariable UUID id) {
        requireSystem("role:assign");
        return rbacService.listCourseGrants(id);
    }

    /** Thay TOÀN BỘ quyền lẻ của user này tại khóa học này bằng đúng danh
     * sách gửi lên (mảng rỗng = gỡ hết) — khớp UX tick checkbox rồi lưu. */
    @PutMapping("/users/{id}/course-grants/{courseId}")
    public List<UserCourseGrantDto> setCourseGrants(@PathVariable UUID id, @PathVariable Long courseId,
            @Valid @RequestBody SetCourseGrantsRequest request) {
        requireSystem("role:assign");
        UUID actingAdminId = currentUserProvider.require().id();
        return rbacService.setCourseGrants(id, courseId, request.capabilities(), actingAdminId);
    }

    @DeleteMapping("/users/{id}/course-grants/{courseId}")
    public ResponseEntity<Void> clearCourseGrants(@PathVariable UUID id, @PathVariable Long courseId) {
        requireSystem("role:assign");
        rbacService.clearCourseGrants(id, courseId);
        return ResponseEntity.noContent().build();
    }

    private void requireSystem(String capability) {
        AuthenticatedUser current = currentUserProvider.require();
        permissionService.requireSystemCapability(current.id(), capability);
    }
}
