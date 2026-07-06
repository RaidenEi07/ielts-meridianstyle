package com.meridian.catalog;

import com.meridian.catalog.dto.EnrollmentDto;
import com.meridian.catalog.dto.EnrollmentRequests;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.roster.RosterService;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnrollmentService {

    private static final String CAP_MANAGE = "course:manage";

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final RosterService rosterService;
    private final PermissionService permissionService;
    private final ContextService contextService;

    public EnrollmentService(EnrollmentRepository enrollmentRepository,
            CourseRepository courseRepository, UserRepository userRepository,
            RosterService rosterService, PermissionService permissionService,
            ContextService contextService) {
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.rosterService = rosterService;
        this.permissionService = permissionService;
        this.contextService = contextService;
    }

    @Transactional
    public EnrollmentDto enroll(UUID userId, EnrollmentRequests.Enroll req) {
        Course course = getPublishedCourse(req.courseId());
        return doEnroll(requireUser(userId), course);
    }

    /**
     * Giáo viên cấp quyền truy cập khóa học cho một học sinh mình phụ trách
     * (đã được admin gán qua roster) — chỉ trong phạm vi khóa học giáo viên đó
     * có quyền 'course:manage'.
     */
    @Transactional
    public EnrollmentDto enrollByTeacher(UUID teacherId, UUID studentId, Long courseId) {
        if (!rosterService.isAssigned(teacherId, studentId)) {
            throw ApiException.forbidden("Học sinh này không thuộc quyền quản lý của bạn");
        }
        Course course = getPublishedCourse(courseId);
        permissionService.requireCapability(teacherId, CAP_MANAGE, contextIdOf(course.getContext()));
        return doEnroll(requireUser(studentId), course);
    }

    private Course getPublishedCourse(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khóa học"));
        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw ApiException.badRequest("Khóa học chưa được xuất bản");
        }
        return course;
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Người dùng không tồn tại"));
    }

    private EnrollmentDto doEnroll(User user, Course course) {
        if (enrollmentRepository.existsByUserIdAndCourseId(user.getId(), course.getId())) {
            throw ApiException.conflict("Đã ghi danh khóa học này");
        }
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(user);
        enrollment.setCourse(course);
        enrollment.setStatus(EnrollmentStatus.ACTIVE);
        return EnrollmentDto.from(enrollmentRepository.save(enrollment));
    }

    private Long contextIdOf(Context ctx) {
        if (ctx == null) {
            return contextService.requireSystemContext().getId();
        }
        return ctx.getId();
    }

    @Transactional(readOnly = true)
    public List<EnrollmentDto> listMyEnrollments(UUID userId) {
        return enrollmentRepository.findByUserIdOrderByEnrolledAtDesc(userId).stream()
                .map(EnrollmentDto::from).toList();
    }

    @Transactional
    public EnrollmentDto updateProgress(UUID userId, Long enrollmentId,
            EnrollmentRequests.UpdateProgress req) {
        Enrollment enrollment = getOwned(userId, enrollmentId);
        enrollment.setProgressPct(req.progressPct());
        if (req.status() != null && !req.status().isBlank()) {
            try {
                enrollment.setStatus(EnrollmentStatus.valueOf(req.status().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("Trạng thái ghi danh không hợp lệ");
            }
        } else if (req.progressPct() >= 100) {
            enrollment.setStatus(EnrollmentStatus.COMPLETED);
        }
        return EnrollmentDto.from(enrollmentRepository.save(enrollment));
    }

    @Transactional
    public void unenroll(UUID userId, Long enrollmentId) {
        Enrollment enrollment = getOwned(userId, enrollmentId);
        enrollmentRepository.delete(enrollment);
    }

    private Enrollment getOwned(UUID userId, Long enrollmentId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy ghi danh"));
        if (!enrollment.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("Không phải ghi danh của bạn");
        }
        return enrollment;
    }
}
