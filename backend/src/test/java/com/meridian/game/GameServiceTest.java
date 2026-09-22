package com.meridian.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.common.ApiException;
import com.meridian.question.Audience;
import com.meridian.question.Question;
import com.meridian.question.QuestionCategory;
import com.meridian.question.QuestionMatchingPair;
import com.meridian.question.QuestionMatchingPairRepository;
import com.meridian.question.QuestionOption;
import com.meridian.question.QuestionOptionRepository;
import com.meridian.question.QuestionRepository;
import com.meridian.question.QuestionType;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

/**
 * V51: mọi lượt chơi giờ đi qua {@link GameRound} do server tạo — "points"
 * không còn là tham số client gửi được nữa (xem javadoc GameService), nên
 * phần lớn test cũ quanh awardPoints() được viết lại quanh finishRound().
 */
@ExtendWith(MockitoExtension.class)
class GameServiceTest {

    @Mock private QuestionRepository questionRepository;
    @Mock private QuestionMatchingPairRepository matchingPairRepository;
    @Mock private QuestionOptionRepository questionOptionRepository;
    @Mock private PointsLedgerRepository pointsLedgerRepository;
    @Mock private UserRepository userRepository;
    @Mock private BadgeRepository badgeRepository;
    @Mock private UserBadgeRepository userBadgeRepository;
    @Mock private GameRoundRepository gameRoundRepository;

    private final ObjectMapper json = new ObjectMapper();
    private GameService gameService;

    @BeforeEach
    void setUp() {
        gameService = new GameService(questionRepository, matchingPairRepository,
                questionOptionRepository, pointsLedgerRepository, userRepository,
                badgeRepository, userBadgeRepository, gameRoundRepository, json);
    }

    private void stubRoundSave() {
        when(gameRoundRepository.save(any(GameRound.class))).thenAnswer(inv -> {
            GameRound r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(999L);
            }
            return r;
        });
    }

    private GameRound activeRound(UUID userId, Long roundId, String gameMode, int totalItems) {
        GameRound round = new GameRound();
        round.setId(roundId);
        round.setUserId(userId);
        round.setGameMode(gameMode);
        round.setTotalItems(totalItems);
        round.setAnsweredQuestionIds("[]");
        round.setFinished(false);
        return round;
    }

    private Question kidsQuestion(Long id, Long categoryId, QuestionType type) {
        QuestionCategory category = new QuestionCategory();
        category.setId(categoryId);
        category.setAudience(Audience.KIDS);
        Question q = new Question();
        q.setId(id);
        q.setCategory(category);
        q.setType(type);
        q.setStem("What color is the sky?");
        return q;
    }

    private QuestionMatchingPair pair(Long id, String leftItem, String leftImageUrl) {
        QuestionMatchingPair p = new QuestionMatchingPair();
        p.setId(id);
        p.setLeftItem(leftItem);
        p.setLeftImageUrl(leftImageUrl);
        return p;
    }

    private QuestionOption option(Long id, Long questionId, String content, boolean correct) {
        QuestionOption o = new QuestionOption();
        o.setId(id);
        o.setQuestionId(questionId);
        o.setContent(content);
        o.setCorrect(correct);
        return o;
    }

    private Badge badge(Long id, String code) {
        Badge b = new Badge();
        b.setId(id);
        b.setCode(code);
        b.setName(code);
        b.setDescription(code);
        b.setEmoji("🌟");
        return b;
    }

    private PointsLedger ledgerEntry(String gameMode) {
        PointsLedger p = new PointsLedger();
        p.setGameMode(gameMode);
        p.setPoints(10);
        return p;
    }

    private UserBadge userBadge(UUID userId, Long badgeId) {
        UserBadge ub = new UserBadge();
        ub.setUserId(userId);
        ub.setBadgeId(badgeId);
        return ub;
    }

    // ---- startMemoryRound / startRaceRound ----

    @Test
    void startMemoryRoundCapsAtAvailablePairsWhenFewerThanRequested() {
        stubRoundSave();
        Question q = kidsQuestion(1L, 5L, QuestionType.MATCHING);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MATCHING)).thenReturn(List.of(q));
        when(matchingPairRepository.findByQuestionIdIn(List.of(1L)))
                .thenReturn(List.of(pair(1L, "cat", "cat.png"), pair(2L, "dog", "dog.png")));

        var result = gameService.startMemoryRound(UUID.randomUUID(), null, 6);

        assertThat(result.pairs()).hasSize(2);
        assertThat(result.roundId()).isNotNull();
    }

    @Test
    void startMemoryRoundFiltersByCategoryWhenProvided() {
        stubRoundSave();
        Question inCategory = kidsQuestion(1L, 5L, QuestionType.MATCHING);
        Question otherCategory = kidsQuestion(2L, 6L, QuestionType.MATCHING);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MATCHING)).thenReturn(List.of(inCategory, otherCategory));
        when(matchingPairRepository.findByQuestionIdIn(List.of(1L)))
                .thenReturn(List.of(pair(1L, "cat", "cat.png")));

        var result = gameService.startMemoryRound(UUID.randomUUID(), 5L, 6);

        assertThat(result.pairs()).hasSize(1);
        verify(matchingPairRepository).findByQuestionIdIn(List.of(1L));
    }

    @Test
    void startRaceRoundCapsAtAvailableQuestionsWhenFewerThanRequested() {
        stubRoundSave();
        Question q1 = kidsQuestion(1L, 5L, QuestionType.MULTIPLE_CHOICE);
        Question q2 = kidsQuestion(2L, 5L, QuestionType.MULTIPLE_CHOICE);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MULTIPLE_CHOICE)).thenReturn(List.of(q1, q2));
        when(questionOptionRepository.findByQuestionIdIn(any())).thenReturn(List.of(
                option(10L, 1L, "Blue", true), option(11L, 1L, "Red", false),
                option(20L, 2L, "Sun", true), option(21L, 2L, "Moon", false)));

        var result = gameService.startRaceRound(UUID.randomUUID(), null, 8);

        assertThat(result.questions()).hasSize(2);
        assertThat(result.questions()).allSatisfy(rq -> assertThat(rq.options()).hasSize(2));
        assertThat(result.roundId()).isNotNull();
    }

    @Test
    void startRaceRoundNeverLeaksCorrectFlag() {
        stubRoundSave();
        Question q1 = kidsQuestion(1L, 5L, QuestionType.MULTIPLE_CHOICE);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MULTIPLE_CHOICE)).thenReturn(List.of(q1));
        when(questionOptionRepository.findByQuestionIdIn(any()))
                .thenReturn(List.of(option(10L, 1L, "Blue", true), option(11L, 1L, "Red", false)));

        var result = gameService.startRaceRound(UUID.randomUUID(), null, 8);

        // RaceOptionDto chỉ có (id, content) — không có accessor nào lộ đáp án đúng.
        assertThat(result.questions().get(0).options()).extracting("id", "content")
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(10L, "Blue"),
                        org.assertj.core.groups.Tuple.tuple(11L, "Red"));
    }

    // ---- checkRaceAnswer ----

    @Test
    void checkRaceAnswerReturnsTrueForCorrectOptionAndAccumulatesOnTheRound() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));
        when(questionOptionRepository.findByQuestionIdOrderBySortOrderAsc(1L))
                .thenReturn(List.of(option(10L, 1L, "Blue", true), option(11L, 1L, "Red", false)));

        var result = gameService.checkRaceAnswer(userId, 1L, 1L, 10L);

        assertThat(result.correct()).isTrue();
        assertThat(round.getCorrectCount()).isEqualTo(1);
    }

    @Test
    void checkRaceAnswerReturnsFalseForIncorrectOptionAndDoesNotAccumulate() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));
        when(questionOptionRepository.findByQuestionIdOrderBySortOrderAsc(1L))
                .thenReturn(List.of(option(10L, 1L, "Blue", true), option(11L, 1L, "Red", false)));

        var result = gameService.checkRaceAnswer(userId, 1L, 1L, 11L);

        assertThat(result.correct()).isFalse();
        assertThat(round.getCorrectCount()).isZero();
    }

    @Test
    void checkRaceAnswerReturnsFalseWhenTimedOutWithNoSelection() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));

        var result = gameService.checkRaceAnswer(userId, 1L, 1L, null);

        assertThat(result.correct()).isFalse();
        assertThat(round.getCorrectCount()).isZero();
        verify(questionOptionRepository, never()).findByQuestionIdOrderBySortOrderAsc(any());
    }

    /** Chính test chứng minh lỗ hổng "can thiệp tham số" cũ đã được chặn:
     * spam đúng 1 câu nhiều lần không còn cộng dồn được nữa. */
    @Test
    void checkRaceAnswerDoesNotDoubleCountTheSameQuestionAnsweredTwice() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));
        when(questionOptionRepository.findByQuestionIdOrderBySortOrderAsc(1L))
                .thenReturn(List.of(option(10L, 1L, "Blue", true)));

        gameService.checkRaceAnswer(userId, 1L, 1L, 10L);
        gameService.checkRaceAnswer(userId, 1L, 1L, 10L);
        gameService.checkRaceAnswer(userId, 1L, 1L, 10L);

        assertThat(round.getCorrectCount()).isEqualTo(1);
    }

    @Test
    void checkRaceAnswerRejectsRoundBelongingToAnotherUser() {
        UUID userId = UUID.randomUUID();
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gameService.checkRaceAnswer(userId, 1L, 1L, 10L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(404));
    }

    @Test
    void checkRaceAnswerRejectsAlreadyFinishedRound() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        round.setFinished(true);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));

        assertThatThrownBy(() -> gameService.checkRaceAnswer(userId, 1L, 1L, 10L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(400));
    }

    // ---- finishRound (thay awardPoints cũ) ----

    @Test
    void finishRoundComputesPointsFromServerTrackedCorrectCountForRaceMode() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        round.setCorrectCount(8);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));

        var result = gameService.finishRound(userId, 1L, "Hoàn thành lượt đua");

        assertThat(result.pointsEarned()).isEqualTo(80);
        assertThat(round.isFinished()).isTrue();
        verify(pointsLedgerRepository).save(any(PointsLedger.class));
    }

    @Test
    void finishRoundForMemoryModeUsesServerRecordedTotalItems() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 2L, GameService.MODE_MEMORY, 6);
        when(gameRoundRepository.findByIdAndUserId(2L, userId)).thenReturn(Optional.of(round));

        var result = gameService.finishRound(userId, 2L, "Hoàn thành lượt lật thẻ");

        assertThat(result.pointsEarned()).isEqualTo(60);
    }

    @Test
    void finishRoundWithZeroCorrectAnswersSavesNoLedgerEntryOrBadges() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8); // correctCount mặc định 0
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));

        var result = gameService.finishRound(userId, 1L, "test");

        assertThat(result.pointsEarned()).isZero();
        assertThat(result.badges()).isEmpty();
        verify(pointsLedgerRepository, never()).save(any());
    }

    @Test
    void finishRoundRejectsAlreadyFinishedRound() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        round.setFinished(true);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));

        assertThatThrownBy(() -> gameService.finishRound(userId, 1L, "test"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(400));

        verify(pointsLedgerRepository, never()).save(any());
    }

    @Test
    void finishRoundRejectsRoundBelongingToAnotherUser() {
        UUID userId = UUID.randomUUID();
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gameService.finishRound(userId, 1L, "test"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(404));
    }

    @Test
    void finishRoundFirstEverEarnsFirstPlayBadge() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        round.setCorrectCount(1);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));
        when(pointsLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(ledgerEntry("quick_race")));
        when(badgeRepository.findAll()).thenReturn(List.of(badge(1L, "FIRST_PLAY")));
        when(userBadgeRepository.findByUserId(userId)).thenReturn(List.of());

        var result = gameService.finishRound(userId, 1L, "test");

        assertThat(result.badges()).extracting("code").containsExactly("FIRST_PLAY");
        verify(userBadgeRepository).save(any(UserBadge.class));
    }

    @Test
    void finishRoundDoesNotReawardAlreadyEarnedBadge() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_MEMORY, 6);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));
        when(pointsLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(ledgerEntry("memory_match")));
        when(badgeRepository.findAll()).thenReturn(List.of(badge(1L, "FIRST_PLAY")));
        when(userBadgeRepository.findByUserId(userId)).thenReturn(List.of(userBadge(userId, 1L)));

        var result = gameService.finishRound(userId, 1L, "test");

        assertThat(result.badges()).isEmpty();
        verify(userBadgeRepository, never()).save(any());
    }

    @Test
    void finishRoundEarnsBothModesBadgeAfterPlayingBothModes() {
        UUID userId = UUID.randomUUID();
        GameRound round = activeRound(userId, 1L, GameService.MODE_RACE, 8);
        round.setCorrectCount(1);
        when(gameRoundRepository.findByIdAndUserId(1L, userId)).thenReturn(Optional.of(round));
        when(pointsLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(ledgerEntry("memory_match"), ledgerEntry("quick_race")));
        when(badgeRepository.findAll()).thenReturn(List.of(badge(1L, "BOTH_MODES")));
        when(userBadgeRepository.findByUserId(userId)).thenReturn(List.of());

        var result = gameService.finishRound(userId, 1L, "test");

        assertThat(result.badges()).extracting("code").containsExactly("BOTH_MODES");
    }

    // ---- allBadgesWithStatus / leaderboard (không đổi ở V51) ----

    @Test
    void allBadgesWithStatusMarksEarnedCorrectly() {
        UUID userId = UUID.randomUUID();
        when(badgeRepository.findAll()).thenReturn(List.of(badge(1L, "FIRST_PLAY"), badge(2L, "FIVE_ROUNDS")));
        when(userBadgeRepository.findByUserId(userId)).thenReturn(List.of(userBadge(userId, 1L)));

        var result = gameService.allBadgesWithStatus(userId);

        assertThat(result).extracting("code", "earned")
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("FIRST_PLAY", true),
                        org.assertj.core.groups.Tuple.tuple("FIVE_ROUNDS", false));
    }

    @Test
    void leaderboardAggregatesTotalPointsPerUser() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setFullName("Be An");

        PointsLedgerRepository.LeaderboardRow row = new PointsLedgerRepository.LeaderboardRow() {
            @Override
            public UUID getUserId() {
                return userId;
            }

            @Override
            public long getTotal() {
                return 90L;
            }
        };
        when(pointsLedgerRepository.topByTotalPoints(any())).thenReturn(List.of(row));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(user));

        var result = gameService.leaderboard(10);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).fullName()).isEqualTo("Be An");
        assertThat(result.get(0).totalPoints()).isEqualTo(90L);
    }
}
