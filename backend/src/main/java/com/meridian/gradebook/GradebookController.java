package com.meridian.gradebook;

import com.meridian.gradebook.dto.ReportDtos.GradebookRow;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Sổ điểm của học viên (điểm của chính mình). */
@RestController
@RequestMapping("/api/gradebook")
public class GradebookController {

    private final ReportService reportService;
    private final CurrentUserProvider currentUser;

    public GradebookController(ReportService reportService, CurrentUserProvider currentUser) {
        this.reportService = reportService;
        this.currentUser = currentUser;
    }

    @GetMapping("/me")
    public List<GradebookRow> myGrades(
            @RequestParam(required = false) Long courseId) {
        return reportService.myGradebook(currentUser.require().id(), courseId);
    }
}
