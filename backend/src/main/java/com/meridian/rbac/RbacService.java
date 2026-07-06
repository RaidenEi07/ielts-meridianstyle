package com.meridian.rbac;

import com.meridian.auth.dto.RoleAssignmentDto;
import com.meridian.common.ApiException;
import com.meridian.rbac.dto.AdminUserDto;
import com.meridian.rbac.dto.AssignRoleRequest;
import com.meridian.rbac.dto.CreateUserRequest;
import com.meridian.rbac.dto.RoleDto;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tác vụ quản trị RBAC: liệt kê user/role/capability, tạo tài khoản, gán/thu hồi role.
 * Việc kiểm quyền được thực hiện ở tầng controller qua @RequireSystemCapability.
 */
@Service
public class RbacService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CapabilityRepository capabilityRepository;
    private final RoleAssignmentRepository roleAssignmentRepository;
    private final ContextService contextService;
    private final PasswordEncoder passwordEncoder;

    public RbacService(UserRepository userRepository, RoleRepository roleRepository,
            CapabilityRepository capabilityRepository,
            RoleAssignmentRepository roleAssignmentRepository,
            ContextService contextService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.capabilityRepository = capabilityRepository;
        this.roleAssignmentRepository = roleAssignmentRepository;
        this.contextService = contextService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> listUsers(String search) {
        List<User> users = (search == null || search.isBlank())
                ? userRepository.findAll()
                : userRepository.search(search.trim());
        return users.stream()
                .map(u -> AdminUserDto.from(u, roleAssignmentRepository.findByUserId(u.getId())
                        .stream().map(RoleAssignmentDto::from).toList()))
                .toList();
    }

    @Transactional
    public AdminUserDto createUser(CreateUserRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw ApiException.conflict("Tên đăng nhập đã được sử dụng");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw ApiException.conflict("Email đã được sử dụng");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName());
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        List<RoleAssignmentDto> assignments = List.of();
        if (request.roleShortname() != null && !request.roleShortname().isBlank()) {
            Role role = roleRepository.findByShortname(request.roleShortname())
                    .orElseThrow(() -> ApiException.notFound(
                            "Không tìm thấy role '" + request.roleShortname() + "'"));
            Context systemContext = contextService.requireSystemContext();
            RoleAssignment assignment = new RoleAssignment();
            assignment.setUser(user);
            assignment.setRole(role);
            assignment.setContext(systemContext);
            roleAssignmentRepository.save(assignment);
            assignments = List.of(RoleAssignmentDto.from(assignment));
        }
        return AdminUserDto.from(user, assignments);
    }

    @Transactional(readOnly = true)
    public List<RoleDto> listRoles() {
        return roleRepository.findAll().stream().map(RoleDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<String> listCapabilities() {
        return capabilityRepository.findAll().stream()
                .map(Capability::getName).sorted().toList();
    }

    @Transactional
    public RoleAssignmentDto assignRole(AssignRoleRequest request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
        Role role = roleRepository.findByShortname(request.roleShortname())
                .orElseThrow(() -> ApiException.notFound(
                        "Không tìm thấy role '" + request.roleShortname() + "'"));
        Context context = request.contextId() == null
                ? contextService.requireSystemContext()
                : contextService.getById(request.contextId());

        if (roleAssignmentRepository.existsByUserAndRoleAndContext(user, role, context)) {
            throw ApiException.conflict("User đã có role này tại context này");
        }

        RoleAssignment assignment = new RoleAssignment();
        assignment.setUser(user);
        assignment.setRole(role);
        assignment.setContext(context);
        return RoleAssignmentDto.from(roleAssignmentRepository.save(assignment));
    }

    @Transactional
    public void revokeAssignment(Long assignmentId) {
        if (!roleAssignmentRepository.existsById(assignmentId)) {
            throw ApiException.notFound("Không tìm thấy role assignment");
        }
        roleAssignmentRepository.deleteById(assignmentId);
    }
}
