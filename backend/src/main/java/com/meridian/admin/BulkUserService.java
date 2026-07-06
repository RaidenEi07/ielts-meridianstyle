package com.meridian.admin;

import com.meridian.admin.dto.AdminDtos.BulkImportRequest;
import com.meridian.admin.dto.AdminDtos.BulkImportResult;
import com.meridian.admin.dto.AdminDtos.BulkUserRow;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.rbac.Role;
import com.meridian.rbac.RoleAssignment;
import com.meridian.rbac.RoleAssignmentRepository;
import com.meridian.rbac.RoleRepository;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Import người dùng hàng loạt (JSON), tự gán role student tại SYSTEM. */
@Service
public class BulkUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RoleAssignmentRepository roleAssignmentRepository;
    private final ContextService contextService;
    private final PasswordEncoder passwordEncoder;
    private final PermissionService permissionService;

    public BulkUserService(UserRepository userRepository, RoleRepository roleRepository,
            RoleAssignmentRepository roleAssignmentRepository, ContextService contextService,
            PasswordEncoder passwordEncoder, PermissionService permissionService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.roleAssignmentRepository = roleAssignmentRepository;
        this.contextService = contextService;
        this.passwordEncoder = passwordEncoder;
        this.permissionService = permissionService;
    }

    @Transactional
    public BulkImportResult importUsers(UUID uid, BulkImportRequest req) {
        permissionService.requireSystemCapability(uid, "user:bulkupload");

        Role studentRole = roleRepository.findByShortname("student")
                .orElseThrow(() -> new IllegalStateException("Chưa seed role student"));
        Context systemCtx = contextService.requireSystemContext();

        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();
        List<BulkUserRow> rows = req.users() != null ? req.users() : List.of();

        for (BulkUserRow row : rows) {
            if (row.email() == null || row.email().isBlank()
                    || row.fullName() == null || row.fullName().isBlank()) {
                errors.add("Thiếu email/họ tên: " + row.email());
                continue;
            }
            if (userRepository.existsByEmailIgnoreCase(row.email())) {
                skipped++;
                continue;
            }
            String username = resolveUsername(row);
            if (username == null) {
                errors.add("Không tạo được tên đăng nhập cho: " + row.email());
                continue;
            }
            String password = (row.password() != null && row.password().length() >= 8)
                    ? row.password() : "Meridian@123";

            User user = new User();
            user.setUsername(username);
            user.setEmail(row.email());
            user.setFullName(row.fullName());
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setStatus(UserStatus.ACTIVE);
            user = userRepository.save(user);

            RoleAssignment ra = new RoleAssignment();
            ra.setUser(user);
            ra.setRole(studentRole);
            ra.setContext(systemCtx);
            roleAssignmentRepository.save(ra);
            created++;
        }
        return new BulkImportResult(created, skipped, errors);
    }

    /**
     * Dùng username được cung cấp (nếu còn trống) hoặc tự sinh từ phần trước @
     * của email; nếu trùng, thử thêm hậu tố số cho tới khi tìm được tên rảnh.
     */
    private String resolveUsername(BulkUserRow row) {
        String base = (row.username() != null && !row.username().isBlank())
                ? row.username().trim()
                : row.email().substring(0, row.email().indexOf('@'))
                        .replaceAll("[^a-zA-Z0-9._]", "");
        if (base.isBlank()) {
            return null;
        }
        if (!userRepository.existsByUsernameIgnoreCase(base)) {
            return base;
        }
        for (int i = 2; i <= 20; i++) {
            String candidate = base + i;
            if (!userRepository.existsByUsernameIgnoreCase(candidate)) {
                return candidate;
            }
        }
        return null;
    }
}
