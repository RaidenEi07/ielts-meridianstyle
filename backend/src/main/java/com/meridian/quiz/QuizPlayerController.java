package com.meridian.quiz;

import com.meridian.quiz.dto.AttemptDtos.AttemptPlayer;
import com.meridian.quiz.dto.AttemptDtos.AttemptResult;
import com.meridian.quiz.dto.AttemptDtos.AttemptSummary;
import com.meridian.quiz.dto.AttemptDtos.ViolationResult;
import com.meridian.quiz.dto.AttemptRequests;
import com.meridian.quiz.dto.QuizDtos.QuizDto;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Luồng làm bài cho thí sinh. */
@RestController
public class QuizPlayerController {

    private final QuizService quizService;
    private final AttemptService attemptService;
    private final CurrentUserProvider currentUser;

    public QuizPlayerController(QuizService quizService, AttemptService attemptService,
            CurrentUserProvider currentUser) {
        this.quizService = quizService;
        this.attemptService = attemptService;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping("/api/courses/{courseId}/quizzes")
    public List<QuizDto> courseQuizzes(@PathVariable Long courseId) {
        currentUser.require();
        return quizService.listPublishedByCourse(courseId);
    }

    @PostMapping("/api/quizzes/{quizId}/attempts")
    public ResponseEntity<AttemptPlayer> start(@PathVariable Long quizId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attemptService.startAttempt(uid(), quizId));
    }

    @GetMapping("/api/attempts/me")
    public List<AttemptSummary> myAttempts() {
        return attemptService.myAttempts(uid());
    }

    @GetMapping("/api/attempts/{id}")
    public AttemptPlayer getAttempt(@PathVariable Long id) {
        return attemptService.getAttempt(uid(), id);
    }

    @PatchMapping("/api/attempts/{id}/answers")
    public ResponseEntity<Void> saveAnswer(@PathVariable Long id,
            @Valid @RequestBody AttemptRequests.SaveAnswer req) {
        attemptService.saveAnswer(uid(), id, req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/attempts/{id}/logs")
    public ViolationResult logEvent(@PathVariable Long id,
            @Valid @RequestBody AttemptRequests.LogEvent req) {
        return attemptService.logEvent(uid(), id, req);
    }

    @PostMapping("/api/attempts/{id}/submit")
    public AttemptResult submit(@PathVariable Long id) {
        return attemptService.submit(uid(), id);
    }

    @GetMapping("/api/attempts/{id}/result")
    public AttemptResult result(@PathVariable Long id) {
        return attemptService.getResult(uid(), id);
    }
}
