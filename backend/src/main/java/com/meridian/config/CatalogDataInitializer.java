package com.meridian.config;

import com.meridian.catalog.CatalogService;
import com.meridian.catalog.CourseCategoryRepository;
import com.meridian.catalog.dto.CategoryDto;
import com.meridian.catalog.dto.CategoryRequests;
import com.meridian.catalog.dto.CourseDetailDto;
import com.meridian.catalog.dto.CourseRequests;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Seed danh mục/khóa học mẫu (chạy sau DataInitializer để có sẵn tài khoản admin).
 * Dùng chính CatalogService với danh nghĩa admin nên context được tạo đúng quy trình.
 */
@Component
@Order(2)
public class CatalogDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogDataInitializer.class);

    private final CourseCategoryRepository categoryRepository;
    private final CatalogService catalogService;
    private final UserRepository userRepository;
    private final Environment env;

    public CatalogDataInitializer(CourseCategoryRepository categoryRepository,
            CatalogService catalogService, UserRepository userRepository,
            Environment env) {
        this.categoryRepository = categoryRepository;
        this.catalogService = catalogService;
        this.userRepository = userRepository;
        this.env = env;
    }

    @Override
    public void run(String... args) {
        if (categoryRepository.count() > 0) {
            return; // đã seed
        }
        String adminEmail = env.getProperty("ADMIN_EMAIL", "admin@meridian.edu.vn");
        User admin = userRepository.findByEmailIgnoreCase(adminEmail).orElse(null);
        if (admin == null) {
            log.warn("Chưa có tài khoản admin, bỏ qua seed catalog");
            return;
        }
        var uid = admin.getId();

        CategoryDto ielts = catalogService.createCategory(uid,
                new CategoryRequests.Create("Luyện thi IELTS",
                        "luyen-thi-ielts",
                        "Khóa luyện thi IELTS theo chuẩn phòng thi máy (CDT).",
                        "IELTS", null));
        catalogService.createCategory(uid,
                new CategoryRequests.Create("Tiếng Anh giao tiếp",
                        "tieng-anh-giao-tiep",
                        "Phản xạ giao tiếp theo chủ đề thực tế.", null, null));
        catalogService.createCategory(uid,
                new CategoryRequests.Create("Ngữ pháp nền tảng",
                        "ngu-phap-nen-tang",
                        "Hệ thống ngữ pháp từ cơ bản đến nâng cao.", null, null));

        CourseDetailDto course = catalogService.createCourse(uid,
                new CourseRequests.CreateCourse(
                        ielts.id(),
                        "IELTS Intensive 6.5+",
                        "ielts-intensive-65",
                        "Lộ trình 12 tuần chinh phục band 6.5+ với mô phỏng thi thật.",
                        null,
                        new BigDecimal("4990000"),
                        "PUBLISHED",
                        null,
                        null,
                        null));

        catalogService.createSection(uid, course.id(),
                new CourseRequests.CreateSection("Tuần 1-4: Nền tảng & Listening", 1, null, null, null));
        catalogService.createSection(uid, course.id(),
                new CourseRequests.CreateSection("Tuần 5-8: Reading & Writing Task 1", 2, null, null, null));
        catalogService.createSection(uid, course.id(),
                new CourseRequests.CreateSection("Tuần 9-12: Luyện đề & thi thử", 3, null, null, null));

        log.info("Đã seed {} danh mục và khóa học mẫu", categoryRepository.count());
    }
}
