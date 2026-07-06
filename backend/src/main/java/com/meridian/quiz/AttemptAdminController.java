package com.meridian.quiz;

import com.meridian.quiz.dto.AttemptDtos.AttemptResult;
import com.meridian.quiz.dto.AttemptDtos.AttemptSummary;
import com.meridian.quiz.dto.AttemptDtos.LogDto;
import com.meridian.quiz.dto.AttemptRequests;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Quản lý lượt làm bài (giáo viên): override / regrade / reopen / xóa / log. */
@RestController
@RequestMapping("/api/admin")
public class AttemptAdminController {

    private final AttemptService attemptService;
    private final CurrentUserProvider currentUser;

    public AttemptAdminController(AttemptService attemptService,
            CurrentUserProvider currentUser) {
        this.attemptService = attemptService;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping("/quizzes/{quizId}/attempts")
    public List<AttemptSummary> listAttempts(@PathVariable Long quizId) {
        return attemptService.listQuizAttempts(uid(), quizId);
    }

    @GetMapping("/attempts/{id}/logs")
    public List<LogDto> logs(@PathVariable Long id) {
        return attemptService.attemptLogs(uid(), id);
    }

    @PostMapping("/attempts/{id}/override")
    public AttemptSummary override(@PathVariable Long id,
            @RequestBody AttemptRequests.OverrideAttempt req) {
        return attemptService.override(uid(), id, req);
    }

    @PostMapping("/attempts/{id}/regrade")
    public AttemptResult regrade(@PathVariable Long id) {
        return attemptService.regrade(uid(), id);
    }

    @PostMapping("/attempts/{id}/reopen")
    public AttemptSummary reopen(@PathVariable Long id) {
        return attemptService.reopen(uid(), id);
    }

    @DeleteMapping("/attempts/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        attemptService.deleteAttempt(uid(), id);
        return ResponseEntity.noContent().build();
    }
}
