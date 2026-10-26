package com.meridian.classroom;

import com.meridian.classroom.dto.ClassDtos.AddMembers;
import com.meridian.classroom.dto.ClassDtos.AddMembersResult;
import com.meridian.classroom.dto.ClassDtos.ClassDetail;
import com.meridian.classroom.dto.ClassDtos.ClassSummary;
import com.meridian.classroom.dto.ClassDtos.LinkCourse;
import com.meridian.classroom.dto.ClassDtos.LinkCourseResult;
import com.meridian.classroom.dto.ClassDtos.SaveClass;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Quản lý lớp học — mọi handler kiểm 'enrollment:manage' trong {@link ClassService}. */
@RestController
@RequestMapping("/api/admin/classes")
public class ClassController {

    private final ClassService classService;
    private final CurrentUserProvider currentUser;

    public ClassController(ClassService classService, CurrentUserProvider currentUser) {
        this.classService = classService;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping
    public List<ClassSummary> list(@RequestParam(required = false) Long courseId) {
        return classService.list(uid(), courseId);
    }

    @PostMapping
    public ResponseEntity<ClassSummary> create(@Valid @RequestBody SaveClass req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(classService.create(uid(), req.name(), req.description()));
    }

    @GetMapping("/{id}")
    public ClassDetail detail(@PathVariable Long id) {
        return classService.detail(uid(), id);
    }

    @PutMapping("/{id}")
    public ClassSummary update(@PathVariable Long id, @Valid @RequestBody SaveClass req) {
        return classService.update(uid(), id, req.name(), req.description());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        classService.delete(uid(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/members")
    public AddMembersResult addMembers(@PathVariable Long id, @Valid @RequestBody AddMembers req) {
        return classService.addMembers(uid(), id, req.userIds());
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id, @PathVariable UUID userId) {
        classService.removeMember(uid(), id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/courses")
    public LinkCourseResult linkCourse(@PathVariable Long id, @Valid @RequestBody LinkCourse req) {
        return classService.linkCourse(uid(), id, req.courseId());
    }

    @DeleteMapping("/{id}/courses/{courseId}")
    public ResponseEntity<Void> unlinkCourse(@PathVariable Long id, @PathVariable Long courseId) {
        classService.unlinkCourse(uid(), id, courseId);
        return ResponseEntity.noContent().build();
    }
}
