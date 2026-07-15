package com.meridian.game;

import com.meridian.common.ApiException;
import com.meridian.game.dto.GameDtos.LeaderboardEntryDto;
import com.meridian.game.dto.GameDtos.MemoryPairDto;
import com.meridian.question.Audience;
import com.meridian.question.Question;
import com.meridian.question.QuestionMatchingPair;
import com.meridian.question.QuestionMatchingPairRepository;
import com.meridian.question.QuestionRepository;
import com.meridian.question.QuestionType;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Game hóa (Phase 19, lát 1: Lật thẻ ghi nhớ) — điểm thưởng + bảng xếp hạng. */
@Service
public class GameService {

    private static final int DEFAULT_PAIR_COUNT = 6;
    private static final Set<String> ALLOWED_GAME_MODES = Set.of("memory_match");

    private final QuestionRepository questionRepository;
    private final QuestionMatchingPairRepository matchingPairRepository;
    private final PointsLedgerRepository pointsLedgerRepository;
    private final UserRepository userRepository;

    public GameService(QuestionRepository questionRepository,
            QuestionMatchingPairRepository matchingPairRepository,
            PointsLedgerRepository pointsLedgerRepository, UserRepository userRepository) {
        this.questionRepository = questionRepository;
        this.matchingPairRepository = matchingPairRepository;
        this.pointsLedgerRepository = pointsLedgerRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<MemoryPairDto> startMemoryRound(Long categoryId, Integer pairCount) {
        int requested = pairCount != null && pairCount > 0 ? pairCount : DEFAULT_PAIR_COUNT;

        List<Question> questions = questionRepository
                .findByCategory_AudienceAndTypeOrderByCreatedAtDesc(Audience.KIDS, QuestionType.MATCHING);
        if (categoryId != null) {
            questions = questions.stream()
                    .filter(q -> q.getCategory().getId().equals(categoryId))
                    .toList();
        }
        List<Long> questionIds = questions.stream().map(Question::getId).toList();
        if (questionIds.isEmpty()) {
            return List.of();
        }

        List<QuestionMatchingPair> pairs = matchingPairRepository.findByQuestionIdIn(questionIds);
        List<QuestionMatchingPair> shuffled = new java.util.ArrayList<>(pairs);
        Collections.shuffle(shuffled);

        return shuffled.stream()
                .limit(Math.min(requested, shuffled.size()))
                .map(p -> new MemoryPairDto(p.getId(), p.getLeftItem(), p.getLeftImageUrl() != null
                        ? p.getLeftImageUrl() : p.getRightImageUrl()))
                .toList();
    }

    @Transactional
    public void awardPoints(UUID userId, int points, String reason, String gameMode) {
        if (points <= 0) {
            throw ApiException.badRequest("Điểm thưởng phải lớn hơn 0");
        }
        if (gameMode == null || !ALLOWED_GAME_MODES.contains(gameMode)) {
            throw ApiException.badRequest("Chế độ game không hợp lệ");
        }
        PointsLedger entry = new PointsLedger();
        entry.setUserId(userId);
        entry.setPoints(points);
        entry.setReason(reason == null ? "" : reason);
        entry.setGameMode(gameMode);
        pointsLedgerRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntryDto> leaderboard(int limit) {
        List<PointsLedgerRepository.LeaderboardRow> rows = pointsLedgerRepository
                .topByTotalPoints(PageRequest.of(0, Math.max(1, limit)));
        if (rows.isEmpty()) {
            return List.of();
        }
        List<UUID> userIds = rows.stream().map(PointsLedgerRepository.LeaderboardRow::getUserId).toList();
        Map<UUID, User> usersById = new HashMap<>();
        userRepository.findAllById(userIds).forEach(u -> usersById.put(u.getId(), u));

        return rows.stream()
                .map(r -> {
                    User u = usersById.get(r.getUserId());
                    String name = u != null ? u.getFullName() : "(đã xóa)";
                    return new LeaderboardEntryDto(name, r.getTotal());
                })
                .toList();
    }
}
