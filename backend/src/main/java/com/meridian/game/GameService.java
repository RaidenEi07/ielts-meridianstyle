package com.meridian.game;

import com.meridian.common.ApiException;
import com.meridian.game.dto.GameDtos.BadgeDto;
import com.meridian.game.dto.GameDtos.CheckAnswerResult;
import com.meridian.game.dto.GameDtos.FinishRoundResult;
import com.meridian.game.dto.GameDtos.LeaderboardEntryDto;
import com.meridian.game.dto.GameDtos.MemoryPairDto;
import com.meridian.game.dto.GameDtos.RaceOptionDto;
import com.meridian.game.dto.GameDtos.RaceQuestionDto;
import com.meridian.game.dto.GameDtos.StartMemoryRoundDto;
import com.meridian.game.dto.GameDtos.StartRaceRoundDto;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Game hóa (Phase 19: Lật thẻ ghi nhớ + Đua trả lời nhanh) — điểm thưởng +
 * bảng xếp hạng.
 *
 * <p><b>V51 — chống can thiệp tham số điểm thưởng:</b> trước đây
 * {@code awardPoints(userId, points, reason, gameMode)} nhận thẳng "points"
 * do CHÍNH TRÌNH DUYỆT học sinh tự cộng rồi báo lên — server chỉ kiểm
 * {@code > 0} và gameMode nằm trong danh sách hợp lệ, không xác minh gì
 * thêm, nên học sinh có thể tự ý gửi bất kỳ số điểm nào mà không cần chơi
 * thật (parameter tampering — tìm ra khi luyện lăng kính "Ranh giới tin
 * cậy"). Giờ mọi lượt chơi đi qua {@link GameRound} do CHÍNH SERVER tạo:
 * <ul>
 *   <li>Đua trả lời nhanh: server đã tự chấm đúng/sai từng câu qua
 *   {@link #checkRaceAnswer} từ trước — chỉ là kết quả đó bị vứt đi ngay,
 *   không lưu lại. Giờ cộng dồn vào đúng {@code GameRound.correctCount}
 *   (chặn cộng trùng 1 câu nhiều lần qua {@code answeredQuestionIds}), điểm
 *   cuối = correctCount × hằng số — không nhận số điểm từ client nữa.</li>
 *   <li>Lật thẻ: trò chơi lật 2 thẻ so trùng pairId hoàn toàn ở phía client
 *   (cả 2 mặt của mỗi cặp đều được gửi sẵn từ lúc bắt đầu lượt, không có gì
 *   bí mật để server xác minh "khớp hay không" theo từng lượt lật) — điểm
 *   dựa trên {@code totalItems} (số cặp THẬT server đã phát cho đúng lượt
 *   này), không dựa trên số client tự khai. Vẫn còn hạn chế: gọi kết thúc
 *   ngay sau khi bắt đầu (không chơi thật) vẫn được tính đủ điểm — xác minh
 *   "chơi thật" cho kiểu game lật thẻ cần đổi cách gửi dữ liệu (giấu pairId
 *   khỏi client), việc lớn hơn phạm vi lần sửa này; nhưng KHÔNG CÒN gửi được
 *   số điểm tùy ý — mức hại tối đa giờ chỉ còn bằng đúng 1 lượt chơi hợp lệ.</li>
 * </ul>
 */
@Service
public class GameService {

    private static final int DEFAULT_PAIR_COUNT = 6;
    private static final int DEFAULT_QUESTION_COUNT = 8;
    private static final int POINTS_PER_CORRECT_RACE_ANSWER = 10;
    private static final int POINTS_PER_MEMORY_PAIR = 10;
    static final String MODE_MEMORY = "memory_match";
    static final String MODE_RACE = "quick_race";

    private final QuestionRepository questionRepository;
    private final QuestionMatchingPairRepository matchingPairRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final PointsLedgerRepository pointsLedgerRepository;
    private final UserRepository userRepository;
    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final GameRoundRepository gameRoundRepository;
    private final ObjectMapper json;

    public GameService(QuestionRepository questionRepository,
            QuestionMatchingPairRepository matchingPairRepository,
            QuestionOptionRepository questionOptionRepository,
            PointsLedgerRepository pointsLedgerRepository, UserRepository userRepository,
            BadgeRepository badgeRepository, UserBadgeRepository userBadgeRepository,
            GameRoundRepository gameRoundRepository, ObjectMapper json) {
        this.questionRepository = questionRepository;
        this.matchingPairRepository = matchingPairRepository;
        this.questionOptionRepository = questionOptionRepository;
        this.pointsLedgerRepository = pointsLedgerRepository;
        this.userRepository = userRepository;
        this.badgeRepository = badgeRepository;
        this.userBadgeRepository = userBadgeRepository;
        this.gameRoundRepository = gameRoundRepository;
        this.json = json;
    }

    @Transactional
    public StartMemoryRoundDto startMemoryRound(UUID userId, Long categoryId, Integer pairCount) {
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
            return new StartMemoryRoundDto(null, List.of());
        }

        List<QuestionMatchingPair> pairs = matchingPairRepository.findByQuestionIdIn(questionIds);
        List<QuestionMatchingPair> shuffled = new ArrayList<>(pairs);
        Collections.shuffle(shuffled);

        List<MemoryPairDto> result = shuffled.stream()
                .limit(Math.min(requested, shuffled.size()))
                .map(p -> new MemoryPairDto(p.getId(), p.getLeftItem(), p.getLeftImageUrl() != null
                        ? p.getLeftImageUrl() : p.getRightImageUrl()))
                .toList();

        GameRound round = new GameRound();
        round.setUserId(userId);
        round.setGameMode(MODE_MEMORY);
        round.setTotalItems(result.size());
        round = gameRoundRepository.save(round);
        return new StartMemoryRoundDto(round.getId(), result);
    }

    @Transactional
    public StartRaceRoundDto startRaceRound(UUID userId, Long categoryId, Integer questionCount) {
        int requested = questionCount != null && questionCount > 0 ? questionCount : DEFAULT_QUESTION_COUNT;

        List<Question> questions = questionRepository
                .findByCategory_AudienceAndTypeOrderByCreatedAtDesc(Audience.KIDS, QuestionType.MULTIPLE_CHOICE);
        if (categoryId != null) {
            questions = questions.stream()
                    .filter(q -> q.getCategory().getId().equals(categoryId))
                    .toList();
        }
        if (questions.isEmpty()) {
            return new StartRaceRoundDto(null, List.of());
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

        List<RaceQuestionDto> result = selected.stream()
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

        GameRound round = new GameRound();
        round.setUserId(userId);
        round.setGameMode(MODE_RACE);
        round.setTotalItems(result.size());
        round.setAnsweredQuestionIds("[]");
        round = gameRoundRepository.save(round);
        return new StartRaceRoundDto(round.getId(), result);
    }

    /** Vẫn trả đúng/sai ngay cho từng câu (giữ nguyên UX phản hồi tức thì) —
     * khác trước ở chỗ giờ CÓ LƯU LẠI: câu đúng và CHƯA từng được tính cho
     * lượt này thì cộng vào correctCount, làm cơ sở tính điểm lúc kết thúc. */
    @Transactional
    public CheckAnswerResult checkRaceAnswer(UUID userId, Long roundId, Long questionId, Long selectedOptionId) {
        GameRound round = requireActiveRound(userId, roundId, MODE_RACE);

        boolean correct = selectedOptionId != null && questionOptionRepository
                .findByQuestionIdOrderBySortOrderAsc(questionId).stream()
                .anyMatch(o -> o.isCorrect() && o.getId().equals(selectedOptionId));

        if (correct) {
            Set<Long> answered = parseIds(round.getAnsweredQuestionIds());
            if (answered.add(questionId)) {
                round.setCorrectCount(round.getCorrectCount() + 1);
                round.setAnsweredQuestionIds(toJsonArray(answered));
                gameRoundRepository.save(round);
            }
        }
        return new CheckAnswerResult(correct);
    }

    /** Kết thúc 1 lượt chơi và tính điểm THẬT từ chính lượt đó (xem javadoc
     * đầu class) — thay hẳn awardPoints(userId, points, reason, gameMode) cũ,
     * không còn tham số "points" nào tới từ client nữa. */
    @Transactional
    public FinishRoundResult finishRound(UUID userId, Long roundId, String reason) {
        GameRound round = requireActiveRound(userId, roundId, null);
        round.setFinished(true);
        gameRoundRepository.save(round);

        int points = MODE_RACE.equals(round.getGameMode())
                ? round.getCorrectCount() * POINTS_PER_CORRECT_RACE_ANSWER
                : round.getTotalItems() * POINTS_PER_MEMORY_PAIR;

        List<BadgeDto> badges = points > 0
                ? awardPointsInternal(userId, points, reason, round.getGameMode())
                : List.of();
        return new FinishRoundResult(points, badges);
    }

    private GameRound requireActiveRound(UUID userId, Long roundId, String expectedMode) {
        GameRound round = gameRoundRepository.findByIdAndUserId(roundId, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy lượt chơi"));
        if (round.isFinished()) {
            throw ApiException.badRequest("Lượt chơi này đã kết thúc rồi");
        }
        if (expectedMode != null && !expectedMode.equals(round.getGameMode())) {
            throw ApiException.badRequest("Lượt chơi không đúng loại");
        }
        return round;
    }

    private Set<Long> parseIds(String jsonArray) {
        Set<Long> ids = new HashSet<>();
        if (jsonArray == null || jsonArray.isBlank()) {
            return ids;
        }
        try {
            JsonNode node = json.readTree(jsonArray);
            node.forEach(n -> ids.add(n.asLong()));
        } catch (Exception ignored) {
            // dữ liệu cũ/hỏng -> coi như chưa trả lời câu nào, không chặn ván chơi
        }
        return ids;
    }

    private String toJsonArray(Set<Long> ids) {
        return json.writeValueAsString(ids);
    }

    /** Lõi ghi sổ điểm + xét huy hiệu — trước đây là public awardPoints(),
     * giờ chỉ gọi được từ nội bộ (qua finishRound) vì "points"/"gameMode"
     * luôn phải do server tự tính, không nhận trực tiếp từ request nào nữa. */
    private List<BadgeDto> awardPointsInternal(UUID userId, int points, String reason, String gameMode) {
        PointsLedger entry = new PointsLedger();
        entry.setUserId(userId);
        entry.setPoints(points);
        entry.setReason(reason == null ? "" : reason);
        entry.setGameMode(gameMode);
        pointsLedgerRepository.save(entry);
        return checkAndAwardBadges(userId);
    }

    private List<BadgeDto> checkAndAwardBadges(UUID userId) {
        List<PointsLedger> history = pointsLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int totalRounds = history.size();
        long totalPoints = history.stream().mapToLong(PointsLedger::getPoints).sum();
        Map<String, Long> roundsByMode = history.stream()
                .collect(Collectors.groupingBy(PointsLedger::getGameMode, Collectors.counting()));

        Set<Long> earnedBadgeIds = userBadgeRepository.findByUserId(userId).stream()
                .map(UserBadge::getBadgeId)
                .collect(Collectors.toSet());

        List<BadgeDto> newlyEarned = new ArrayList<>();
        for (Badge badge : badgeRepository.findAll()) {
            if (earnedBadgeIds.contains(badge.getId())) {
                continue;
            }
            boolean satisfied = switch (badge.getCode()) {
                case "FIRST_PLAY" -> totalRounds >= 1;
                case "FIVE_ROUNDS" -> totalRounds >= 5;
                case "HUNDRED_POINTS" -> totalPoints >= 100;
                case "MEMORY_MASTER" -> roundsByMode.getOrDefault("memory_match", 0L) >= 5;
                case "RACE_MASTER" -> roundsByMode.getOrDefault("quick_race", 0L) >= 5;
                case "BOTH_MODES" -> roundsByMode.containsKey("memory_match")
                        && roundsByMode.containsKey("quick_race");
                default -> false;
            };
            if (!satisfied) {
                continue;
            }
            UserBadge earned = new UserBadge();
            earned.setUserId(userId);
            earned.setBadgeId(badge.getId());
            userBadgeRepository.save(earned);
            newlyEarned.add(new BadgeDto(badge.getCode(), badge.getName(), badge.getDescription(),
                    badge.getEmoji(), true));
        }
        return newlyEarned;
    }

    @Transactional(readOnly = true)
    public List<BadgeDto> allBadgesWithStatus(UUID userId) {
        Set<Long> earnedBadgeIds = userBadgeRepository.findByUserId(userId).stream()
                .map(UserBadge::getBadgeId)
                .collect(Collectors.toSet());
        return badgeRepository.findAll().stream()
                .map(b -> new BadgeDto(b.getCode(), b.getName(), b.getDescription(), b.getEmoji(),
                        earnedBadgeIds.contains(b.getId())))
                .toList();
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
