package com.meridian.config;

import com.meridian.portal.TeacherProfile;
import com.meridian.portal.TeacherProfileRepository;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.Role;
import com.meridian.rbac.RoleAssignment;
import com.meridian.rbac.RoleAssignmentRepository;
import com.meridian.rbac.RoleRepository;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Seed hồ sơ giáo viên (nổi bật) cho trang chủ. */
@Component
@Order(5)
public class TeacherDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TeacherDataInitializer.class);

    private record Seed(String email, String name, String headline, String bio, int years) {
    }

    private static final List<Seed> TEACHERS = List.of(
            new Seed("co.mai@meridian.edu.vn", "Nguyễn Thị Mai",
                    "IELTS 8.5 · Chuyên Speaking & Writing",
                    "10 năm luyện thi IELTS, cựu giám khảo speaking.", 10),
            new Seed("thay.hung@meridian.edu.vn", "Trần Quốc Hùng",
                    "IELTS 8.0 · Chuyên Reading & Listening",
                    "Thạc sĩ Ngôn ngữ Anh, phương pháp học thông minh.", 8),
            new Seed("co.lan@meridian.edu.vn", "Phạm Ngọc Lan",
                    "IELTS 8.0 · Nền tảng & Giao tiếp",
                    "Giúp học viên mất gốc tự tin giao tiếp.", 6),
            new Seed("thay.nam@meridian.edu.vn", "Lê Hoài Nam",
                    "IELTS 8.5 · Luyện đề & Chiến thuật",
                    "Chuyên gia luyện đề, tối ưu điểm số phòng thi máy.", 12));

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RoleAssignmentRepository roleAssignmentRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final ContextService contextService;
    private final PasswordEncoder passwordEncoder;

    public TeacherDataInitializer(UserRepository userRepository, RoleRepository roleRepository,
            RoleAssignmentRepository roleAssignmentRepository,
            TeacherProfileRepository teacherProfileRepository, ContextService contextService,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.roleAssignmentRepository = roleAssignmentRepository;
        this.teacherProfileRepository = teacherProfileRepository;
        this.contextService = contextService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (teacherProfileRepository.count() > 0) {
            return;
        }
        Role teacherRole = roleRepository.findByShortname("teacher").orElse(null);
        if (teacherRole == null) {
            return;
        }
        Context systemCtx = contextService.requireSystemContext();

        int order = 0;
        for (Seed s : TEACHERS) {
            User user = userRepository.findByEmailIgnoreCase(s.email()).orElseGet(() -> {
                User u = new User();
                u.setUsername(s.email().substring(0, s.email().indexOf('@')));
                u.setEmail(s.email());
                u.setFullName(s.name());
                u.setPasswordHash(passwordEncoder.encode("Teacher@123"));
                u.setStatus(UserStatus.ACTIVE);
                return userRepository.save(u);
            });

            if (!roleAssignmentRepository.existsByUserAndRoleAndContext(user, teacherRole, systemCtx)) {
                RoleAssignment ra = new RoleAssignment();
                ra.setUser(user);
                ra.setRole(teacherRole);
                ra.setContext(systemCtx);
                roleAssignmentRepository.save(ra);
            }

            TeacherProfile p = new TeacherProfile();
            p.setUser(user);
            p.setHeadline(s.headline());
            p.setBio(s.bio());
            p.setYearsExperience(s.years());
            p.setFeatured(true);
            p.setSortOrder(order++);
            teacherProfileRepository.save(p);
        }
        log.info("Đã seed {} hồ sơ giáo viên", TEACHERS.size());
    }
}
