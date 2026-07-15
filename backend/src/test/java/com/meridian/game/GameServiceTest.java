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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GameServiceTest {

    @Mock private QuestionRepository questionRepository;
    @Mock private QuestionMatchingPairRepository matchingPairRepository;
    @Mock private QuestionOptionRepository questionOptionRepository;
    @Mock private PointsLedgerRepository pointsLedgerRepository;
    @Mock private UserRepository userRepository;
    @Mock private BadgeRepository badgeRepository;
    @Mock private UserBadgeRepository userBadgeRepository;

    private GameService gameService;

    @BeforeEach
    void setUp() {
        gameService = new GameService(questionRepository, matchingPairRepository,
                questionOptionRepository, pointsLedgerRepository, userRepository,
                badgeRepository, userBadgeRepository);
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

    @Test
    void startMemoryRoundCapsAtAvailablePairsWhenFewerThanRequested() {
        Question q = kidsQuestion(1L, 5L, QuestionType.MATCHING);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MATCHING)).thenReturn(List.of(q));
        when(matchingPairRepository.findByQuestionIdIn(List.of(1L)))
                .thenReturn(List.of(pair(1L, "cat", "cat.png"), pair(2L, "dog", "dog.png")));

        var result = gameService.startMemoryRound(null, 6);

        assertThat(result).hasSize(2);
    }

    @Test
    void startMemoryRoundFiltersByCategoryWhenProvided() {
        Question inCategory = kidsQuestion(1L, 5L, QuestionType.MATCHING);
        Question otherCategory = kidsQuestion(2L, 6L, QuestionType.MATCHING);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MATCHING)).thenReturn(List.of(inCategory, otherCategory));
        when(matchingPairRepository.findByQuestionIdIn(List.of(1L)))
                .thenReturn(List.of(pair(1L, "cat", "cat.png")));

        var result = gameService.startMemoryRound(5L, 6);

        assertThat(result).hasSize(1);
        verify(matchingPairRepository).findByQuestionIdIn(List.of(1L));
    }

    @Test
    void startRaceRoundCapsAtAvailableQuestionsWhenFewerThanRequested() {
        Question q1 = kidsQuestion(1L, 5L, QuestionType.MULTIPLE_CHOICE);
        Question q2 = kidsQuestion(2L, 5L, QuestionType.MULTIPLE_CHOICE);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MULTIPLE_CHOICE)).thenReturn(List.of(q1, q2));
        when(questionOptionRepository.findByQuestionIdIn(any())).thenReturn(List.of(
                option(10L, 1L, "Blue", true), option(11L, 1L, "Red", false),
                option(20L, 2L, "Sun", true), option(21L, 2L, "Moon", false)));

        var result = gameService.startRaceRound(null, 8);

        assertThat(result).hasSize(2);
        assertThat(result).allSatisfy(rq -> assertThat(rq.options()).hasSize(2));
    }

    @Test
    void startRaceRoundNeverLeaksCorrectFlag() {
        Question q1 = kidsQuestion(1L, 5L, QuestionType.MULTIPLE_CHOICE);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MULTIPLE_CHOICE)).thenReturn(List.of(q1));
        when(questionOptionRepository.findByQuestionIdIn(any()))
                .thenReturn(List.of(option(10L, 1L, "Blue", true), option(11L, 1L, "Red", false)));

        var result = gameService.startRaceRound(null, 8);

        // RaceOptionDto chỉ có (id, content) — không có accessor nào lộ đáp án đúng.
        assertThat(result.get(0).options()).extracting("id", "content")
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(10L, "Blue"),
                        org.assertj.core.groups.Tuple.tuple(11L, "Red"));
    }

    @Test
    void checkRaceAnswerReturnsTrueForCorrectOption() {
        when(questionOptionRepository.findByQuestionIdOrderBySortOrderAsc(1L))
                .thenReturn(List.of(option(10L, 1L, "Blue", true), option(11L, 1L, "Red", false)));

        var result = gameService.checkRaceAnswer(1L, 10L);

        assertThat(result.correct()).isTrue();
    }

    @Test
    void checkRaceAnswerReturnsFalseForIncorrectOption() {
        when(questionOptionRepository.findByQuestionIdOrderBySortOrderAsc(1L))
                .thenReturn(List.of(option(10L, 1L, "Blue", true), option(11L, 1L, "Red", false)));

        var result = gameService.checkRaceAnswer(1L, 11L);

        assertThat(result.correct()).isFalse();
    }

    @Test
    void checkRaceAnswerReturnsFalseWhenTimedOutWithNoSelection() {
        var result = gameService.checkRaceAnswer(1L, null);

        assertThat(result.correct()).isFalse();
        verify(questionOptionRepository, never()).findByQuestionIdOrderBySortOrderAsc(any());
    }

    @Test
    void awardPointsAcceptsQuickRaceMode() {
        UUID userId = UUID.randomUUID();

        gameService.awardPoints(userId, 80, "Hoàn thành lượt đua", "quick_race");

        verify(pointsLedgerRepository).save(any(PointsLedger.class));
    }

    @Test
    void awardPointsRejectsNonPositivePoints() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> gameService.awardPoints(userId, 0, "test", "memory_match"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(400));

        verify(pointsLedgerRepository, never()).save(any());
    }

    @Test
    void awardPointsRejectsUnknownGameMode() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> gameService.awardPoints(userId, 10, "test", "unknown_mode"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(400));

        verify(pointsLedgerRepository, never()).save(any());
    }

    @Test
    void awardPointsSavesValidEntry() {
        UUID userId = UUID.randomUUID();

        gameService.awardPoints(userId, 60, "Hoàn thành lượt chơi", "memory_match");

        verify(pointsLedgerRepository).save(any(PointsLedger.class));
    }

    @Test
    void awardPointsFirstEverEarnsFirstPlayBadge() {
        UUID userId = UUID.randomUUID();
        when(pointsLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(ledgerEntry("memory_match")));
        when(badgeRepository.findAll()).thenReturn(List.of(badge(1L, "FIRST_PLAY")));
        when(userBadgeRepository.findByUserId(userId)).thenReturn(List.of());

        var result = gameService.awardPoints(userId, 10, "test", "memory_match");

        assertThat(result).extracting("code").containsExactly("FIRST_PLAY");
        verify(userBadgeRepository).save(any(UserBadge.class));
    }

    @Test
    void awardPointsDoesNotReawardAlreadyEarnedBadge() {
        UUID userId = UUID.randomUUID();
        when(pointsLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(ledgerEntry("memory_match")));
        when(badgeRepository.findAll()).thenReturn(List.of(badge(1L, "FIRST_PLAY")));
        when(userBadgeRepository.findByUserId(userId)).thenReturn(List.of(userBadge(userId, 1L)));

        var result = gameService.awardPoints(userId, 10, "test", "memory_match");

        assertThat(result).isEmpty();
        verify(userBadgeRepository, never()).save(any());
    }

    @Test
    void awardPointsEarnsBothModesBadgeAfterPlayingBothModes() {
        UUID userId = UUID.randomUUID();
        when(pointsLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(ledgerEntry("memory_match"), ledgerEntry("quick_race")));
        when(badgeRepository.findAll()).thenReturn(List.of(badge(1L, "BOTH_MODES")));
        when(userBadgeRepository.findByUserId(userId)).thenReturn(List.of());

        var result = gameService.awardPoints(userId, 10, "test", "quick_race");

        assertThat(result).extracting("code").containsExactly("BOTH_MODES");
    }

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
