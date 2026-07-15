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
    @Mock private PointsLedgerRepository pointsLedgerRepository;
    @Mock private UserRepository userRepository;

    private GameService gameService;

    @BeforeEach
    void setUp() {
        gameService = new GameService(questionRepository, matchingPairRepository,
                pointsLedgerRepository, userRepository);
    }

    private Question kidsMatchingQuestion(Long id, Long categoryId) {
        QuestionCategory category = new QuestionCategory();
        category.setId(categoryId);
        category.setAudience(Audience.KIDS);
        Question q = new Question();
        q.setId(id);
        q.setCategory(category);
        q.setType(QuestionType.MATCHING);
        return q;
    }

    private QuestionMatchingPair pair(Long id, String leftItem, String leftImageUrl) {
        QuestionMatchingPair p = new QuestionMatchingPair();
        p.setId(id);
        p.setLeftItem(leftItem);
        p.setLeftImageUrl(leftImageUrl);
        return p;
    }

    @Test
    void startMemoryRoundCapsAtAvailablePairsWhenFewerThanRequested() {
        Question q = kidsMatchingQuestion(1L, 5L);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MATCHING)).thenReturn(List.of(q));
        when(matchingPairRepository.findByQuestionIdIn(List.of(1L)))
                .thenReturn(List.of(pair(1L, "cat", "cat.png"), pair(2L, "dog", "dog.png")));

        var result = gameService.startMemoryRound(null, 6);

        assertThat(result).hasSize(2);
    }

    @Test
    void startMemoryRoundFiltersByCategoryWhenProvided() {
        Question inCategory = kidsMatchingQuestion(1L, 5L);
        Question otherCategory = kidsMatchingQuestion(2L, 6L);
        when(questionRepository.findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
                Audience.KIDS, QuestionType.MATCHING)).thenReturn(List.of(inCategory, otherCategory));
        when(matchingPairRepository.findByQuestionIdIn(List.of(1L)))
                .thenReturn(List.of(pair(1L, "cat", "cat.png")));

        var result = gameService.startMemoryRound(5L, 6);

        assertThat(result).hasSize(1);
        verify(matchingPairRepository).findByQuestionIdIn(List.of(1L));
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
