package com.meridian.progress;

import com.meridian.progress.dto.CourseProgressDto;
import com.meridian.security.CurrentUserProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Tiến độ học của user hiện tại — tự giới hạn theo user đăng nhập, không cần capability riêng. */
@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    private final LessonProgressService progressService;
    private final CurrentUserProvider currentUser;

    public ProgressController(LessonProgressService progressService, CurrentUserProvider currentUser) {
        this.progressService = progressService;
        this.currentUser = currentUser;
    }

    @GetMapping("/courses/{courseId}")
    public CourseProgressDto courseProgress(@PathVariable Long courseId) {
        return new CourseProgressDto(
                progressService.completedSectionIds(currentUser.require().id(), courseId));
    }

    @PostMapping("/sections/{sectionId}/complete")
    public ResponseEntity<Void> complete(@PathVariable Long sectionId) {
        progressService.markCompleteAsStudent(currentUser.require().id(), sectionId);
        return ResponseEntity.noContent().build();
    }
}
