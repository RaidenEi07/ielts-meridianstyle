package com.meridian.recommendation;

import com.meridian.recommendation.dto.RecommendedCoursesDto;
import com.meridian.security.CurrentUserProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Gợi ý khóa học cho user hiện tại — tự giới hạn theo user đăng nhập. */
@RestController
@RequestMapping("/api/students/me")
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final CurrentUserProvider currentUser;

    public RecommendationController(RecommendationService recommendationService,
            CurrentUserProvider currentUser) {
        this.recommendationService = recommendationService;
        this.currentUser = currentUser;
    }

    @GetMapping("/recommended-courses")
    public RecommendedCoursesDto recommendedCourses() {
        return recommendationService.recommendedCoursesFor(currentUser.require().id());
    }
}
