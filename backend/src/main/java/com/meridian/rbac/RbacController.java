package com.meridian.rbac;

import com.meridian.auth.dto.RoleAssignmentDto;
import com.meridian.rbac.dto.AdminUserDto;
import com.meridian.rbac.dto.AssignRoleRequest;
import com.meridian.rbac.dto.CreateUserRequest;
import com.meridian.rbac.dto.RoleDto;
import com.meridian.security.AuthenticatedUser;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    @GetMapping("/users")
    public List<AdminUserDto> listUsers(@RequestParam(required = false) String search) {
        requireSystem("user:manage");
        return rbacService.listUsers(search);
    }

    @PostMapping("/users")
    public ResponseEntity<AdminUserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        requireSystem("user:manage");
        return ResponseEntity.status(HttpStatus.CREATED).body(rbacService.createUser(request));
    }

    @GetMapping("/roles")
    public List<RoleDto> listRoles() {
        requireSystem("role:assign");
        return rbacService.listRoles();
    }

    @GetMapping("/capabilities")
    public List<String> listCapabilities() {
        requireSystem("role:assign");
        return rbacService.listCapabilities();
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

    private void requireSystem(String capability) {
        AuthenticatedUser current = currentUserProvider.require();
        permissionService.requireSystemCapability(current.id(), capability);
    }
}
