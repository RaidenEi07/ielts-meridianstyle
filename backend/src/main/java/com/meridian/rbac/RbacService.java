package com.meridian.rbac;

import com.meridian.auth.dto.RoleAssignmentDto;
import com.meridian.catalog.Course;
import com.meridian.catalog.CourseRepository;
import com.meridian.common.ApiException;
import com.meridian.rbac.dto.AdminUserDto;
import com.meridian.rbac.dto.AssignRoleRequest;
import com.meridian.rbac.dto.CapabilityDto;
import com.meridian.rbac.dto.CreateUserRequest;
import com.meridian.rbac.dto.RoleDto;
import com.meridian.rbac.dto.UpdateUserRequest;
import com.meridian.rbac.dto.UserCourseGrantDto;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tác vụ quản trị RBAC: liệt kê user/role/capability, tạo tài khoản, gán/thu hồi role,
 * và gán quyền lẻ theo khóa học (không qua role - xem UserCapabilityGrant, V47).
 * Việc kiểm quyền được thực hiện ở tầng controller qua @RequireSystemCapability.
 */
@Service
public class RbacService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CapabilityRepository capabilityRepository;
    private final RoleAssignmentRepository roleAssignmentRepository;
    private final UserCapabilityGrantRepository userCapabilityGrantRepository;
    private final CourseRepository courseRepository;
    private final ContextService contextService;
    private final PasswordEncoder passwordEncoder;

    public RbacService(UserRepository userRepository, RoleRepository roleRepository,
            CapabilityRepository capabilityRepository,
            RoleAssignmentRepository roleAssignmentRepository,
            UserCapabilityGrantRepository userCapabilityGrantRepository,
            CourseRepository courseRepository,
            ContextService contextService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.capabilityRepository = capabilityRepository;
        this.roleAssignmentRepository = roleAssignmentRepository;
        this.userCapabilityGrantRepository = userCapabilityGrantRepository;
        this.courseRepository = courseRepository;
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

    /** Kèm mô tả tiếng Việt sẵn có ở bảng capabilities — cho màn tick chọn
     * quyền lẻ theo khóa học, không phải chỉ 1 chuỗi tên kỹ thuật trơ. */
    @Transactional(readOnly = true)
    public List<CapabilityDto> listCapabilitiesDetailed() {
        return capabilityRepository.findAll().stream()
                .sorted(Comparator.comparing(Capability::getName))
                .map(CapabilityDto::from)
                .toList();
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

    /**
     * Lõi sửa thông tin tài khoản, không tự kiểm tra quyền — 2 lối vào gọi
     * hàm này: {@link #updateOwnProfile} (tự sửa, không cần capability) và
     * controller admin (cần user:manage, kiểm tra ở tầng controller).
     */
    @Transactional
    public AdminUserDto updateUser(UUID targetUserId, UpdateUserRequest req) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
        if (req.fullName() != null && !req.fullName().isBlank()) {
            user.setFullName(req.fullName());
        }
        if (req.email() != null && !req.email().isBlank()
                && !req.email().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailIgnoreCase(req.email())) {
                throw ApiException.conflict("Email đã được sử dụng");
            }
            user.setEmail(req.email());
        }
        if (req.newPassword() != null && !req.newPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        }
        if (req.status() != null && !req.status().isBlank()) {
            try {
                user.setStatus(UserStatus.valueOf(req.status().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("Trạng thái không hợp lệ");
            }
        }
        user = userRepository.save(user);
        List<RoleAssignmentDto> assignments = roleAssignmentRepository.findByUserId(user.getId())
                .stream().map(RoleAssignmentDto::from).toList();
        return AdminUserDto.from(user, assignments);
    }

    /**
     * Tự sửa hồ sơ của chính mình — mọi role đều gọi được, không cần
     * capability, nhưng đổi mật khẩu bắt buộc đúng mật khẩu hiện tại, và
     * không được tự đổi status của chính mình (chỉ admin sửa người khác mới
     * đổi được status).
     */
    @Transactional
    public AdminUserDto updateOwnProfile(UUID userId, UpdateUserRequest req) {
        if (req.newPassword() != null && !req.newPassword().isBlank()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
            if (req.currentPassword() == null
                    || !passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
                throw ApiException.badRequest("Mật khẩu hiện tại không đúng");
            }
        }
        UpdateUserRequest sanitized = new UpdateUserRequest(
                req.fullName(), req.email(), req.newPassword(), req.currentPassword(), null);
        return updateUser(userId, sanitized);
    }

    // ============ Quyền lẻ theo khóa học (không qua role — xem V47) ============

    /** Toàn bộ khóa học mà user này đang được gán ít nhất 1 quyền lẻ, kèm
     * đúng danh sách quyền tại mỗi khóa — dùng cho màn "Quyền theo khóa học"
     * ở trang chi tiết tài khoản admin. */
    @Transactional(readOnly = true)
    public List<UserCourseGrantDto> listCourseGrants(UUID userId) {
        List<UserCapabilityGrant> grants = userCapabilityGrantRepository.findByUserId(userId);
        Map<Long, List<UserCapabilityGrant>> byCourseId = grants.stream()
                .filter(g -> g.getContext().getType() == ContextType.COURSE)
                .collect(Collectors.groupingBy(g -> g.getContext().getInstanceId()));
        if (byCourseId.isEmpty()) {
            return List.of();
        }
        Map<Long, String> titleById = courseRepository.findAllById(byCourseId.keySet()).stream()
                .collect(Collectors.toMap(Course::getId, Course::getTitle));
        return byCourseId.entrySet().stream()
                .map(e -> new UserCourseGrantDto(
                        e.getKey(),
                        titleById.getOrDefault(e.getKey(), "(khóa học đã bị xóa)"),
                        e.getValue().stream().map(g -> g.getCapability().getName()).sorted().toList()))
                .sorted(Comparator.comparing(UserCourseGrantDto::courseTitle))
                .toList();
    }

    /** Thay TOÀN BỘ quyền lẻ của user tại 1 khóa học bằng đúng danh sách
     * capabilityNames (xóa hết grant cũ ở khóa đó, ghi lại từ đầu) — danh
     * sách rỗng nghĩa là gỡ hết quyền lẻ của user ở khóa này (không đụng tới
     * role_assignments hay quyền lẻ ở khóa KHÁC của cùng user). */
    @Transactional
    public List<UserCourseGrantDto> setCourseGrants(
            UUID targetUserId, Long courseId, List<String> capabilityNames, UUID actingAdminId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khóa học"));
        Context context = course.getContext();
        if (context == null) {
            throw ApiException.badRequest("Khóa học này chưa có context, chưa gán được quyền lẻ");
        }

        userCapabilityGrantRepository.deleteByUserIdAndContextId(targetUserId, context.getId());
        for (String capName : capabilityNames) {
            Capability capability = capabilityRepository.findByName(capName)
                    .orElseThrow(() -> ApiException.badRequest("Không tìm thấy quyền '" + capName + "'"));
            UserCapabilityGrant grant = new UserCapabilityGrant();
            grant.setUser(user);
            grant.setCapability(capability);
            grant.setContext(context);
            grant.setPermission(Permission.ALLOW);
            grant.setCreatedBy(actingAdminId);
            userCapabilityGrantRepository.save(grant);
        }
        return listCourseGrants(targetUserId);
    }

    /** Gỡ hết quyền lẻ của user tại 1 khóa học — dùng cho nút "Gỡ" cả khối,
     * thay vì bắt admin bỏ tick từng ô rồi lưu. */
    @Transactional
    public void clearCourseGrants(UUID targetUserId, Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khóa học"));
        Context context = course.getContext();
        if (context == null) {
            return;
        }
        userCapabilityGrantRepository.deleteByUserIdAndContextId(targetUserId, context.getId());
    }
}
