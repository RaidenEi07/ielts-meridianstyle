package com.meridian.gradebook;

import com.meridian.gradebook.dto.AnswerGradingDto;
import com.meridian.gradebook.dto.GradeAnswerRequest;
import com.meridian.gradebook.dto.GradeHistoryDto;
import com.meridian.gradebook.dto.ReportDtos.GradebookRow;
import com.meridian.gradebook.dto.ReportDtos.QuizReport;
import com.meridian.gradebook.dto.ReportDtos.SystemAnalytics;
import com.meridian.quiz.dto.AttemptDtos.AttemptResult;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Báo cáo (giáo viên/admin) + chấm tay Essay. */
@RestController
@RequestMapping("/api/admin")
public class ReportController {

    private final ReportService reportService;
    private final GradingAdminService gradingAdminService;
    private final CurrentUserProvider currentUser;

    public ReportController(ReportService reportService,
            GradingAdminService gradingAdminService, CurrentUserProvider currentUser) {
        this.reportService = reportService;
        this.gradingAdminService = gradingAdminService;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping("/quizzes/{quizId}/report")
    public QuizReport quizReport(@PathVariable Long quizId) {
        return reportService.quizReport(uid(), quizId);
    }

    @GetMapping("/analytics")
    public SystemAnalytics analytics() {
        return reportService.systemAnalytics(uid());
    }

    @GetMapping("/students/{userId}/gradebook")
    public List<GradebookRow> studentGradebook(@PathVariable UUID userId,
            @RequestParam(required = false) Long courseId) {
        return reportService.adminStudentGradebook(uid(), userId, courseId);
    }

    @GetMapping("/attempts/{attemptId}/answers")
    public List<AnswerGradingDto> answers(@PathVariable Long attemptId) {
        return gradingAdminService.answersForGrading(uid(), attemptId);
    }

    @PatchMapping("/attempts/{attemptId}/answers/{answerId}/grade")
    public AttemptResult gradeAnswer(@PathVariable Long attemptId,
            @PathVariable Long answerId, @Valid @RequestBody GradeAnswerRequest req) {
        return gradingAdminService.gradeAnswer(uid(), attemptId, answerId, req);
    }

    @GetMapping("/attempts/{attemptId}/grade-history")
    public List<GradeHistoryDto> gradeHistory(@PathVariable Long attemptId) {
        return gradingAdminService.history(uid(), attemptId);
    }
}
