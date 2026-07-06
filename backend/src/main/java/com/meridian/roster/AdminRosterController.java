package com.meridian.roster;

import com.meridian.rbac.PermissionService;
import com.meridian.roster.dto.AssignStudentsRequest;
import com.meridian.roster.dto.StudentSummaryDto;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin gán/gỡ học sinh cho giáo viên quản lý. Yêu cầu capability 'user:manage'. */
@RestController
@RequestMapping("/api/admin/roster")
public class AdminRosterController {

    private final RosterService rosterService;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    public AdminRosterController(RosterService rosterService, CurrentUserProvider currentUser,
            PermissionService permissionService) {
        this.rosterService = rosterService;
        this.currentUser = currentUser;
        this.permissionService = permissionService;
    }

    private void guard() {
        permissionService.requireSystemCapability(currentUser.require().id(), "user:manage");
    }

    @PostMapping("/assign")
    public ResponseEntity<Void> assign(@Valid @RequestBody AssignStudentsRequest req) {
        guard();
        rosterService.assignStudents(req.teacherId(), req.studentIds());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{teacherId}/{studentId}")
    public ResponseEntity<Void> unassign(@PathVariable UUID teacherId, @PathVariable UUID studentId) {
        guard();
        rosterService.unassign(teacherId, studentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public List<StudentSummaryDto> studentsForTeacher(@RequestParam UUID teacherId) {
        guard();
        return rosterService.listStudentsForTeacher(teacherId);
    }
}
