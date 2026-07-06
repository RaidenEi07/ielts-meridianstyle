package com.meridian.config;

import com.meridian.rbac.ContextService;
import com.meridian.rbac.Role;
import com.meridian.rbac.RoleAssignment;
import com.meridian.rbac.RoleAssignmentRepository;
import com.meridian.rbac.RoleRepository;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tạo tài khoản admin mặc định (nếu chưa có) sau khi Flyway đã seed roles/contexts.
 * Tên đăng nhập dùng để xác thực (login); email chỉ để liên hệ. Có thể override
 * qua biến môi trường ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD.
 */
@Component
@Order(1)
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RoleAssignmentRepository roleAssignmentRepository;
    private final ContextService contextService;
    private final PasswordEncoder passwordEncoder;
    private final Environment env;

    public DataInitializer(UserRepository userRepository, RoleRepository roleRepository,
            RoleAssignmentRepository roleAssignmentRepository,
            ContextService contextService, PasswordEncoder passwordEncoder,
            Environment env) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.roleAssignmentRepository = roleAssignmentRepository;
        this.contextService = contextService;
        this.passwordEncoder = passwordEncoder;
        this.env = env;
    }

    @Override
    @Transactional
    public void run(String... args) {
        String username = env.getProperty("ADMIN_USERNAME", "admin");
        String email = env.getProperty("ADMIN_EMAIL", "admin@meridian.edu.vn");
        String password = env.getProperty("ADMIN_PASSWORD", "Admin@123");

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            return;
        }

        User admin = new User();
        admin.setUsername(username);
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setFullName("Quản trị viên Meridian");
        admin.setStatus(UserStatus.ACTIVE);
        admin = userRepository.save(admin);

        Role adminRole = roleRepository.findByShortname("admin")
                .orElseThrow(() -> new IllegalStateException("Chưa seed role 'admin'"));

        RoleAssignment assignment = new RoleAssignment();
        assignment.setUser(admin);
        assignment.setRole(adminRole);
        assignment.setContext(contextService.requireSystemContext());
        roleAssignmentRepository.save(assignment);

        log.info("Đã tạo tài khoản admin mặc định: username='{}' (mật khẩu mặc định: {})",
                username, password);
    }
}
