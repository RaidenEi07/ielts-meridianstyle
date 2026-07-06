package com.meridian.roster;

import com.meridian.catalog.EnrollmentService;
import com.meridian.catalog.dto.EnrollmentDto;
import com.meridian.common.ApiException;
import com.meridian.gradebook.ReportService;
import com.meridian.gradebook.dto.ReportDtos.GradebookRow;
import com.meridian.roster.dto.EnrollStudentRequest;
import com.meridian.roster.dto.StudentSummaryDto;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Giáo viên xem danh sách và kết quả của học sinh mình được gán quản lý.
 * Không cần capability riêng — dữ liệu trả về tự giới hạn theo
 * {@code teacher_id = user hiện tại}, không thể rò rỉ dữ liệu người khác.
 */
@RestController
@RequestMapping("/api/teacher/roster")
public class TeacherRosterController {

    private final RosterService rosterService;
    private final ReportService reportService;
    private final EnrollmentService enrollmentService;
    private final CurrentUserProvider currentUser;

    public TeacherRosterController(RosterService rosterService, ReportService reportService,
            EnrollmentService enrollmentService, CurrentUserProvider currentUser) {
        this.rosterService = rosterService;
        this.reportService = reportService;
        this.enrollmentService = enrollmentService;
        this.currentUser = currentUser;
    }

    @GetMapping("/students")
    public List<StudentSummaryDto> myStudents() {
        return rosterService.listStudentsForTeacher(currentUser.require().id());
    }

    @GetMapping("/students/{studentId}/gradebook")
    public List<GradebookRow> studentGradebook(@PathVariable UUID studentId,
            @RequestParam(required = false) Long courseId) {
        UUID teacherId = currentUser.require().id();
        if (!rosterService.isAssigned(teacherId, studentId)) {
            throw ApiException.forbidden("Học sinh này không thuộc quyền quản lý của bạn");
        }
        return reportService.gradebookForUser(studentId, courseId);
    }

    @PostMapping("/students/{studentId}/enroll")
    public ResponseEntity<EnrollmentDto> enrollStudent(@PathVariable UUID studentId,
            @Valid @RequestBody EnrollStudentRequest req) {
        UUID teacherId = currentUser.require().id();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(enrollmentService.enrollByTeacher(teacherId, studentId, req.courseId()));
    }
}
