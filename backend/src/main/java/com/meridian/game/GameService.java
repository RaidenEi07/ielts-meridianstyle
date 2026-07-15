package com.meridian.game;

import com.meridian.common.ApiException;
import com.meridian.game.dto.GameDtos.CheckAnswerResult;
import com.meridian.game.dto.GameDtos.LeaderboardEntryDto;
import com.meridian.game.dto.GameDtos.MemoryPairDto;
import com.meridian.game.dto.GameDtos.RaceOptionDto;
import com.meridian.game.dto.GameDtos.RaceQuestionDto;
import com.meridian.question.Audience;
import com.meridian.question.Question;
import com.meridian.question.QuestionMatchingPair;
import com.meridian.question.QuestionMatchingPairRepository;
import com.meridian.question.QuestionOption;
import com.meridian.question.QuestionOptionRepository;
import com.meridian.question.QuestionRepository;
import com.meridian.question.QuestionType;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Game hóa (Phase 19: Lật thẻ ghi nhớ + Đua trả lời nhanh) — điểm thưởng + bảng xếp hạng. */
@Service
public class GameService {

    private static final int DEFAULT_PAIR_COUNT = 6;
    private static final int DEFAULT_QUESTION_COUNT = 8;
    private static final Set<String> ALLOWED_GAME_MODES = Set.of("memory_match", "quick_race");

    private final QuestionRepository questionRepository;
    private final QuestionMatchingPairRepository matchingPairRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final PointsLedgerRepository pointsLedgerRepository;
    private final UserRepository userRepository;

    public GameService(QuestionRepository questionRepository,
            QuestionMatchingPairRepository matchingPairRepository,
            QuestionOptionRepository questionOptionRepository,
            PointsLedgerRepository pointsLedgerRepository, UserRepository userRepository) {
        this.questionRepository = questionRepository;
        this.matchingPairRepository = matchingPairRepository;
        this.questionOptionRepository = questionOptionRepository;
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

    @Transactional(readOnly = true)
    public List<RaceQuestionDto> startRaceRound(Long categoryId, Integer questionCount) {
        int requested = questionCount != null && questionCount > 0 ? questionCount : DEFAULT_QUESTION_COUNT;

        List<Question> questions = questionRepository
                .findByCategory_AudienceAndTypeOrderByCreatedAtDesc(Audience.KIDS, QuestionType.MULTIPLE_CHOICE);
        if (categoryId != null) {
            questions = questions.stream()
                    .filter(q -> q.getCategory().getId().equals(categoryId))
                    .toList();
        }
        if (questions.isEmpty()) {
            return List.of();
        }

        List<Question> shuffledQuestions = new ArrayList<>(questions);
        Collections.shuffle(shuffledQuestions);
        List<Question> selected = shuffledQuestions.stream()
                .limit(Math.min(requested, shuffledQuestions.size()))
                .toList();

        List<Long> questionIds = selected.stream().map(Question::getId).toList();
        Map<Long, List<QuestionOption>> optionsByQuestion = questionOptionRepository
                .findByQuestionIdIn(questionIds).stream()
                .collect(Collectors.groupingBy(QuestionOption::getQuestionId));

        return selected.stream()
                .map(q -> {
                    List<QuestionOption> options = new ArrayList<>(
                            optionsByQuestion.getOrDefault(q.getId(), List.of()));
                    Collections.shuffle(options);
                    List<RaceOptionDto> optionDtos = options.stream()
                            .map(o -> new RaceOptionDto(o.getId(), o.getContent()))
                            .toList();
                    return new RaceQuestionDto(q.getId(), q.getStem(), optionDtos);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public CheckAnswerResult checkRaceAnswer(Long questionId, Long selectedOptionId) {
        boolean correct = selectedOptionId != null && questionOptionRepository
                .findByQuestionIdOrderBySortOrderAsc(questionId).stream()
                .anyMatch(o -> o.isCorrect() && o.getId().equals(selectedOptionId));
        return new CheckAnswerResult(correct);
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
