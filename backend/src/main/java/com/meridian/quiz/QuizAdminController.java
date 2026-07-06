package com.meridian.quiz;

import com.meridian.quiz.dto.QuizDtos.QuizDetailDto;
import com.meridian.quiz.dto.QuizDtos.QuizDto;
import com.meridian.quiz.dto.QuizDtos.QuizPageDto;
import com.meridian.quiz.dto.QuizDtos.QuizQuestionDto;
import com.meridian.quiz.dto.QuizRequests;
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

/** Quản lý quiz (giáo viên/admin). Kiểm quyền course:manage trong service. */
@RestController
@RequestMapping("/api/admin")
public class QuizAdminController {

    private final QuizService quizService;
    private final CurrentUserProvider currentUser;

    public QuizAdminController(QuizService quizService, CurrentUserProvider currentUser) {
        this.quizService = quizService;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping("/quizzes")
    public List<QuizDto> listBySection(@RequestParam Long sectionId) {
        return quizService.listBySection(uid(), sectionId);
    }

    @PostMapping("/quizzes")
    public ResponseEntity<QuizDetailDto> create(@Valid @RequestBody QuizRequests.CreateQuiz req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.createQuiz(uid(), req));
    }

    @GetMapping("/quizzes/{id}")
    public QuizDetailDto detail(@PathVariable Long id) {
        return quizService.getQuizDetail(uid(), id);
    }

    @PutMapping("/quizzes/{id}")
    public QuizDetailDto update(@PathVariable Long id, @RequestBody QuizRequests.UpdateQuiz req) {
        return quizService.updateQuiz(uid(), id, req);
    }

    @DeleteMapping("/quizzes/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        quizService.deleteQuiz(uid(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/quizzes/{id}/questions")
    public List<QuizQuestionDto> importQuestions(@PathVariable Long id,
            @Valid @RequestBody QuizRequests.ImportQuestions req) {
        return quizService.importQuestions(uid(), id, req);
    }

    @DeleteMapping("/quiz-questions/{quizQuestionId}")
    public ResponseEntity<Void> removeQuestion(@PathVariable Long quizQuestionId) {
        quizService.removeQuestion(uid(), quizQuestionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/quizzes/{id}/pages")
    public QuizPageDto setPage(@PathVariable Long id, @Valid @RequestBody QuizRequests.SetPage req) {
        return quizService.setPage(uid(), id, req);
    }

    @DeleteMapping("/quiz-pages/{pageId}")
    public ResponseEntity<Void> deletePage(@PathVariable Long pageId) {
        quizService.deletePage(uid(), pageId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/quizzes/reorder")
    public ResponseEntity<Void> reorderQuizzes(@Valid @RequestBody QuizRequests.ReorderQuizzes req) {
        quizService.reorderQuizzes(uid(), req.quizIds());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/quizzes/{id}/questions/reorder")
    public ResponseEntity<Void> reorderQuestions(@PathVariable Long id,
            @Valid @RequestBody QuizRequests.ReorderQuestions req) {
        quizService.reorderQuestions(uid(), id, req.quizQuestionIds());
        return ResponseEntity.noContent().build();
    }
}
