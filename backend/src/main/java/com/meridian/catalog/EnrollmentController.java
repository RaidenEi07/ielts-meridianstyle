package com.meridian.catalog;

import com.meridian.catalog.dto.EnrollmentDto;
import com.meridian.catalog.dto.EnrollmentRequests;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/enrollments")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;
    private final CurrentUserProvider currentUser;

    public EnrollmentController(EnrollmentService enrollmentService,
            CurrentUserProvider currentUser) {
        this.enrollmentService = enrollmentService;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @PostMapping
    public ResponseEntity<EnrollmentDto> enroll(
            @Valid @RequestBody EnrollmentRequests.Enroll req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(enrollmentService.enroll(uid(), req));
    }

    @GetMapping("/me")
    public List<EnrollmentDto> myEnrollments() {
        return enrollmentService.listMyEnrollments(uid());
    }

    @GetMapping("/admin/{userId}")
    public List<EnrollmentDto> adminEnrollments(@PathVariable UUID userId) {
        return enrollmentService.adminListEnrollments(uid(), userId);
    }

    /** Admin ghi danh trực tiếp 1 học sinh vào 1 khóa học — không cần học sinh
     * đã có trong roster của giáo viên nào (khác {@code /api/teacher/roster/.../enroll}). */
    @PostMapping("/admin/{userId}")
    public ResponseEntity<EnrollmentDto> enrollByAdmin(@PathVariable UUID userId,
            @Valid @RequestBody EnrollmentRequests.Enroll req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(enrollmentService.enrollByAdmin(uid(), userId, req.courseId()));
    }

    @PatchMapping("/{id}/progress")
    public EnrollmentDto updateProgress(@PathVariable Long id,
            @Valid @RequestBody EnrollmentRequests.UpdateProgress req) {
        return enrollmentService.updateProgress(uid(), id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> unenroll(@PathVariable Long id) {
        enrollmentService.unenroll(uid(), id);
        return ResponseEntity.noContent().build();
    }

    /** Admin hủy ghi danh bất kỳ học sinh nào khỏi bất kỳ khóa học nào —
     * đối xứng với {@link #enrollByAdmin}. */
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> unenrollByAdmin(@PathVariable Long id) {
        enrollmentService.unenrollByAdmin(uid(), id);
        return ResponseEntity.noContent().build();
    }
}
