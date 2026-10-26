package com.meridian.admin;

import com.meridian.admin.dto.UserImportDtos.ImportRow;
import com.meridian.admin.dto.UserImportDtos.ImportRowResult;
import com.meridian.admin.dto.UserImportDtos.ImportUsersRequest;
import com.meridian.admin.dto.UserImportDtos.ImportUsersResult;
import com.meridian.catalog.EnrollmentService;
import com.meridian.classroom.ClassService;
import com.meridian.common.ApiException;
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
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nhập tài khoản học viên hàng loạt từ file (Excel/CSV đọc ở trình duyệt). File KHÔNG có cột mật khẩu: mỗi
 * tài khoản mới nhận 1 mật khẩu ngẫu nhiên riêng, trả về ĐÚNG 1 LẦN trong kết quả để admin phát cho học viên
 * (không lưu dạng rõ, không ghi log, không dùng mật khẩu mặc định chung). Email đã có tài khoản thì không tạo
 * lại nhưng vẫn được thêm vào lớp/khóa nếu admin chọn.
 *
 * <p>Quyền: 'user:bulkupload'; thêm vào lớp/khóa cần thêm 'enrollment:manage'. Cả lượt nhập chạy trong 1 giao
 * dịch — lớp/khóa không hợp lệ thì không tài khoản nào được tạo.
 */
@Service
public class UserImportService {

    static final int MAX_ROWS = 200;
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern USERNAME = Pattern.compile("^[a-zA-Z0-9._]{3,50}$");
    /** Bỏ các ký tự dễ nhầm (0/O, 1/l/I) để học viên gõ mật khẩu được từ giấy/ảnh chụp. */
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int PASSWORD_LENGTH = 10;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RoleAssignmentRepository roleAssignmentRepository;
    private final ContextService contextService;
    private final PasswordEncoder passwordEncoder;
    private final PermissionService permissionService;
    private final ClassService classService;
    private final EnrollmentService enrollmentService;
    private final SecureRandom random = new SecureRandom();

    public UserImportService(UserRepository userRepository, RoleRepository roleRepository,
            RoleAssignmentRepository roleAssignmentRepository, ContextService contextService,
            PasswordEncoder passwordEncoder, PermissionService permissionService,
            ClassService classService, EnrollmentService enrollmentService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.roleAssignmentRepository = roleAssignmentRepository;
        this.contextService = contextService;
        this.passwordEncoder = passwordEncoder;
        this.permissionService = permissionService;
        this.classService = classService;
        this.enrollmentService = enrollmentService;
    }

    @Transactional
    public ImportUsersResult importUsers(UUID uid, ImportUsersRequest req) {
        permissionService.requireSystemCapability(uid, "user:bulkupload");
        boolean assign = req.classId() != null || req.courseId() != null;
        if (assign) {
            permissionService.requireSystemCapability(uid, "enrollment:manage");
        }
        List<ImportRow> rows = req.rows() == null ? List.of() : req.rows();
        if (rows.isEmpty()) {
            throw ApiException.badRequest("File không có dòng dữ liệu nào");
        }
        if (rows.size() > MAX_ROWS) {
            throw ApiException.badRequest("Mỗi lần nhập tối đa " + MAX_ROWS + " dòng");
        }

        Role studentRole = roleRepository.findByShortname("student")
                .orElseThrow(() -> new IllegalStateException("Chưa seed role student"));
        Context systemCtx = contextService.requireSystemContext();

        List<ImportRowResult> results = new ArrayList<>();
        Set<UUID> assignIds = new LinkedHashSet<>();
        Set<String> seenEmails = new HashSet<>();
        int created = 0;
        int existing = 0;
        int errors = 0;
        int line = 0;

        for (ImportRow row : rows) {
            line++;
            String fullName = clean(row == null ? null : row.fullName());
            String email = clean(row == null ? null : row.email());
            String problem = validate(fullName, email, seenEmails);
            if (problem != null) {
                results.add(new ImportRowResult(line, fullName, email, null, null, "ERROR", problem));
                errors++;
                continue;
            }

            User already = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (already != null) {
                assignIds.add(already.getId());
                results.add(new ImportRowResult(line, fullName, email, already.getUsername(), null,
                        "EXISTING", "Email đã có tài khoản, không tạo lại"));
                existing++;
                continue;
            }

            String username = resolveUsername(clean(row.username()), email);
            if (username == null) {
                results.add(new ImportRowResult(line, fullName, email, null, null, "ERROR",
                        "Tên đăng nhập đã được dùng hoặc không hợp lệ"));
                errors++;
                continue;
            }

            String password = generatePassword();
            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setFullName(fullName);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setStatus(UserStatus.ACTIVE);
            user = userRepository.save(user);

            RoleAssignment ra = new RoleAssignment();
            ra.setUser(user);
            ra.setRole(studentRole);
            ra.setContext(systemCtx);
            roleAssignmentRepository.save(ra);

            assignIds.add(user.getId());
            results.add(new ImportRowResult(line, fullName, email, username, password, "CREATED", null));
            created++;
        }

        int addedToClass = 0;
        int newlyEnrolled = 0;
        if (!assignIds.isEmpty()) {
            if (req.classId() != null) {
                var r = classService.addMembers(uid, req.classId(), new ArrayList<>(assignIds));
                addedToClass = r.added();
                newlyEnrolled += r.newlyEnrolled();
            }
            if (req.courseId() != null) {
                newlyEnrolled += enrollmentService
                        .enrollUsersInCourse(new ArrayList<>(assignIds), req.courseId()).enrolled();
            }
        }
        return new ImportUsersResult(created, existing, errors, addedToClass, newlyEnrolled, results);
    }

    private String validate(String fullName, String email, Set<String> seenEmails) {
        if (fullName == null || fullName.isBlank()) {
            return "Thiếu họ tên";
        }
        if (fullName.length() > 150) {
            return "Họ tên quá dài (tối đa 150 ký tự)";
        }
        if (email == null || email.isBlank()) {
            return "Thiếu email";
        }
        if (email.length() > 255 || !EMAIL.matcher(email).matches()) {
            return "Email không hợp lệ";
        }
        if (!seenEmails.add(email.toLowerCase(Locale.ROOT))) {
            return "Email bị trùng trong file";
        }
        return null;
    }

    /** Dùng username trong file nếu hợp lệ và còn trống; không có thì suy từ phần trước @ của email, trùng thì thêm số. */
    private String resolveUsername(String provided, String email) {
        if (provided != null && !provided.isBlank()) {
            return (USERNAME.matcher(provided).matches() && !userRepository.existsByUsernameIgnoreCase(provided))
                    ? provided : null;
        }
        String base = email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9._]", "");
        if (base.isBlank()) {
            return null;
        }
        if (base.length() > 45) {
            base = base.substring(0, 45);
        }
        if (base.length() < 3) {
            base = base + "000".substring(0, 3 - base.length());
        }
        if (!userRepository.existsByUsernameIgnoreCase(base)) {
            return base;
        }
        for (int i = 2; i <= 99; i++) {
            String candidate = base + i;
            if (!userRepository.existsByUsernameIgnoreCase(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    String generatePassword() {
        StringBuilder sb = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    private static String clean(String s) {
        return s == null ? null : s.trim();
    }
}
