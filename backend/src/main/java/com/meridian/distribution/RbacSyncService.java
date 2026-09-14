package com.meridian.distribution;

import com.meridian.auth.dto.RoleAssignmentDto;
import com.meridian.catalog.Course;
import com.meridian.catalog.CourseRepository;
import com.meridian.common.ApiException;
import com.meridian.distribution.dto.RbacSyncDtos.SyncAccountDto;
import com.meridian.distribution.dto.RbacSyncDtos.SyncCourseGrantDto;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.Role;
import com.meridian.rbac.RoleAssignment;
import com.meridian.rbac.RoleAssignmentRepository;
import com.meridian.rbac.RoleRepository;
import com.meridian.rbac.dto.UserCourseGrantDto;
import com.meridian.rbac.RbacService;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phía NHẬN (web con) của tính năng "web tổng điều khiển role/quyền tài
 * khoản web con" — được gọi qua {@link RbacSyncController}, xác thực bằng
 * API key (giống {@link CourseImportApiKeyFilter}), không qua JWT người
 * dùng. Chỉ chỉnh role/quyền của tài khoản ĐÃ TỒN TẠI ở web con — không tạo
 * hay xóa tài khoản (tài khoản vẫn do web con tự tạo, xem V49).
 *
 * <p>Tái dùng nguyên {@link RbacService} cho phần ghi (assignRole/
 * setCourseGrants...) — ở đây chỉ làm việc DỊCH: role/course tham chiếu
 * bằng shortname (ổn định giữa 2 hệ thống) sang đúng entity/id CỤC BỘ của
 * chính web con này trước khi gọi xuống RbacService.
 */
@Service
public class RbacSyncService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RoleAssignmentRepository roleAssignmentRepository;
    private final CourseRepository courseRepository;
    private final ContextService contextService;
    private final RbacService rbacService;
    private final Environment env;

    public RbacSyncService(UserRepository userRepository, RoleRepository roleRepository,
            RoleAssignmentRepository roleAssignmentRepository, CourseRepository courseRepository,
            ContextService contextService, RbacService rbacService, Environment env) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.roleAssignmentRepository = roleAssignmentRepository;
        this.courseRepository = courseRepository;
        this.contextService = contextService;
        this.rbacService = rbacService;
        this.env = env;
    }

    @Transactional(readOnly = true)
    public List<SyncAccountDto> listAccounts(String search) {
        return rbacService.listUsers(search).stream()
                .map(u -> new SyncAccountDto(u.id(), u.username(), u.email(), u.fullName(), u.status(),
                        u.roleAssignments().stream().map(RoleAssignmentDto::roleShortname).toList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SyncCourseGrantDto> listCourseGrants(UUID userId) {
        List<UserCourseGrantDto> grants = rbacService.listCourseGrants(userId);
        return grants.stream()
                .map(g -> {
                    Course course = courseRepository.findById(g.courseId()).orElse(null);
                    String shortname = course != null ? course.getShortname() : null;
                    return new SyncCourseGrantDto(shortname, g.courseTitle(), g.capabilities());
                })
                .filter(g -> g.courseShortname() != null)
                .toList();
    }

    @Transactional
    public void assignRole(UUID userId, String roleShortname) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
        Role role = roleRepository.findByShortname(roleShortname)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy role '" + roleShortname + "'"));
        Context systemContext = contextService.requireSystemContext();
        if (roleAssignmentRepository.existsByUserAndRoleAndContext(user, role, systemContext)) {
            return; // đã có sẵn, coi như thành công (idempotent — resend nhiều lần không lỗi)
        }
        RoleAssignment assignment = new RoleAssignment();
        assignment.setUser(user);
        assignment.setRole(role);
        assignment.setContext(systemContext);
        roleAssignmentRepository.save(assignment);
    }

    @Transactional
    public void revokeRole(UUID userId, String roleShortname) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
        Role role = roleRepository.findByShortname(roleShortname)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy role '" + roleShortname + "'"));
        Context systemContext = contextService.requireSystemContext();
        roleAssignmentRepository.deleteByUserAndRoleAndContext(user, role, systemContext);
    }

    @Transactional
    public void setCourseGrants(UUID userId, String courseShortname, List<String> capabilities) {
        Course course = courseRepository.findByShortname(courseShortname)
                .orElseThrow(() -> ApiException.notFound(
                        "Web con này chưa có khóa học '" + courseShortname + "' — phân phối khóa học trước"));
        rbacService.setCourseGrants(userId, course.getId(), capabilities, resolveActorId());
    }

    /** Mượn tài khoản admin mặc định của chính deployment này làm actor ghi
     * audit (created_by) — request này xác thực bằng API key, không có
     * người dùng đăng nhập thật. Cùng cách CourseImportService đã làm. */
    private UUID resolveActorId() {
        String adminUsername = env.getProperty("ADMIN_USERNAME", "admin");
        Optional<User> admin = userRepository.findByUsernameIgnoreCase(adminUsername);
        return admin.map(User::getId).orElse(null);
    }
}
