package com.meridian.game;

import com.meridian.game.dto.GameDtos.BadgeDto;
import com.meridian.game.dto.GameDtos.CheckAnswerRequest;
import com.meridian.game.dto.GameDtos.CheckAnswerResult;
import com.meridian.game.dto.GameDtos.FinishRoundRequest;
import com.meridian.game.dto.GameDtos.FinishRoundResult;
import com.meridian.game.dto.GameDtos.LeaderboardEntryDto;
import com.meridian.game.dto.GameDtos.StartMemoryRoundDto;
import com.meridian.game.dto.GameDtos.StartRaceRoundDto;
import com.meridian.question.Audience;
import com.meridian.question.QuestionTaxonomyService;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    public StartMemoryRoundDto memoryRound(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Integer pairCount) {
        return gameService.startMemoryRound(currentUser.require().id(), categoryId, pairCount);
    }

    @GetMapping("/race/round")
    public StartRaceRoundDto raceRound(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Integer questionCount) {
        return gameService.startRaceRound(currentUser.require().id(), categoryId, questionCount);
    }

    @PostMapping("/race/check")
    public CheckAnswerResult checkRaceAnswer(@RequestBody CheckAnswerRequest request) {
        return gameService.checkRaceAnswer(currentUser.require().id(), request.roundId(),
                request.questionId(), request.selectedOptionId());
    }

    /** Thay POST /api/game/points (V51) — không còn nhận "points" từ client,
     * điểm do server tự tính từ đúng lượt roundId (xem GameService). */
    @PostMapping("/rounds/{roundId}/finish")
    public FinishRoundResult finishRound(@PathVariable Long roundId,
            @RequestBody FinishRoundRequest request) {
        return gameService.finishRound(currentUser.require().id(), roundId, request.reason());
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
