package com.meridian.catalog;

import com.meridian.common.ApiException;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ai được xem NỘI DUNG HỌC của một khóa (video, phụ đề, tài liệu bài tập về nhà, câu hỏi chèn trong video,
 * lồng tiếng, danh sách đề): người đã được ghi danh, hoặc người phụ trách khóa (course:manage hoặc
 * report:viewlive tại context của khóa — quản trị viên, giáo viên, quản lý, quản lý chi nhánh).
 *
 * <p>Trang giới thiệu khóa (tiêu đề, mô tả, mục tiêu, tên các buổi) vẫn công khai để quảng bá; chỉ phần nội
 * dung học bị khóa. Học viên không tự ghi danh được nữa — chỉ quản trị viên hoặc giáo viên ghi danh.
 *
 * <p>Chạy trong transaction chỉ đọc: buổi học trỏ tới khóa học dạng lazy, và open-in-view đang tắt — không có
 * transaction thì đọc context của khóa (để xét quyền nhân sự) sẽ lỗi LazyInitializationException.
 */
@Component
@Transactional(readOnly = true)
public class CourseAccessGuard {

    public static final String NOT_ENROLLED =
            "Bạn cần được giáo viên hoặc quản trị viên ghi danh vào khóa học này để xem nội dung.";

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final PermissionService permissionService;
    private final ContextService contextService;

    public CourseAccessGuard(EnrollmentRepository enrollmentRepository, CourseRepository courseRepository,
            CourseSectionRepository sectionRepository, PermissionService permissionService,
            ContextService contextService) {
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.permissionService = permissionService;
        this.contextService = contextService;
    }

    public boolean canAccessContent(UUID userId, Course course) {
        if (userId == null || course == null) {
            return false;
        }
        if (enrollmentRepository.existsByUserIdAndCourseId(userId, course.getId())) {
            return true;
        }
        Long ctx = course.getContext() != null
                ? course.getContext().getId() : contextService.requireSystemContext().getId();
        return permissionService.hasCapability(userId, "course:manage", ctx)
                || permissionService.hasCapability(userId, "report:viewlive", ctx);
    }

    public boolean canAccessContent(UUID userId, Long courseId) {
        return courseRepository.findById(courseId).map(c -> canAccessContent(userId, c)).orElse(false);
    }

    public void requireCourseAccess(UUID userId, Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khóa học"));
        if (!canAccessContent(userId, course)) {
            throw ApiException.forbidden(NOT_ENROLLED);
        }
    }

    public void requireSectionAccess(UUID userId, Long sectionId) {
        CourseSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy buổi học"));
        if (!canAccessContent(userId, section.getCourse())) {
            throw ApiException.forbidden(NOT_ENROLLED);
        }
    }
}
