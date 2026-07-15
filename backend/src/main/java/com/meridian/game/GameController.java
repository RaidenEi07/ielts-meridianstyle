package com.meridian.game;

import com.meridian.game.dto.GameDtos.AwardPointsRequest;
import com.meridian.game.dto.GameDtos.BadgeDto;
import com.meridian.game.dto.GameDtos.CheckAnswerRequest;
import com.meridian.game.dto.GameDtos.CheckAnswerResult;
import com.meridian.game.dto.GameDtos.LeaderboardEntryDto;
import com.meridian.game.dto.GameDtos.MemoryPairDto;
import com.meridian.game.dto.GameDtos.RaceQuestionDto;
import com.meridian.question.Audience;
import com.meridian.question.QuestionTaxonomyService;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Game hóa (Phase 19) — cần đăng nhập, không cần capability riêng. */
@RestController
@RequestMapping("/api/game")
public class GameController {

    private final GameService gameService;
    private final CurrentUserProvider currentUser;
    private final QuestionTaxonomyService taxonomyService;

    public GameController(GameService gameService, CurrentUserProvider currentUser,
            QuestionTaxonomyService taxonomyService) {
        this.gameService = gameService;
        this.currentUser = currentUser;
        this.taxonomyService = taxonomyService;
    }

    /**
     * Danh mục KIDS cho bộ chọn chủ đề game — endpoint riêng vì
     * {@code /api/admin/question-bank/categories} yêu cầu capability
     * 'question:manage' mà học sinh thường không có.
     */
    @GetMapping("/categories")
    public List<QuestionCategoryDto> categories() {
        currentUser.require();
        return taxonomyService.listCategories(Audience.KIDS);
    }

    @GetMapping("/memory/round")
    public List<MemoryPairDto> memoryRound(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Integer pairCount) {
        currentUser.require();
        return gameService.startMemoryRound(categoryId, pairCount);
    }

    @GetMapping("/race/round")
    public List<RaceQuestionDto> raceRound(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Integer questionCount) {
        currentUser.require();
        return gameService.startRaceRound(categoryId, questionCount);
    }

    @PostMapping("/race/check")
    public CheckAnswerResult checkRaceAnswer(@RequestBody CheckAnswerRequest request) {
        currentUser.require();
        return gameService.checkRaceAnswer(request.questionId(), request.selectedOptionId());
    }

    @PostMapping("/points")
    public List<BadgeDto> awardPoints(@RequestBody AwardPointsRequest request) {
        return gameService.awardPoints(currentUser.require().id(), request.points(), request.reason(),
                request.gameMode());
    }

    @GetMapping("/leaderboard")
    public List<LeaderboardEntryDto> leaderboard(@RequestParam(defaultValue = "10") int limit) {
        currentUser.require();
        return gameService.leaderboard(limit);
    }

    @GetMapping("/badges")
    public List<BadgeDto> badges() {
        return gameService.allBadgesWithStatus(currentUser.require().id());
    }
}
