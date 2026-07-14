package com.meridian.quiz;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.meridian.question.QuestionService;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Kiểm tra tự chấm cho từng loại câu hỏi khách quan (all-or-nothing).
 * Essay không tự chấm (cần chấm tay).
 */
@ExtendWith(MockitoExtension.class)
class GradingServiceTest {

    @Mock
    private QuestionService questionService;

    private final ObjectMapper json = new ObjectMapper();
    private GradingService gradingService;

    private static final Long QID = 1L;

    private void stub(QuestionDetailDto dto) {
        gradingService = new GradingService(questionService);
        when(questionService.getQuestion(QID)).thenReturn(dto);
    }

    private QuestionDetailDto dto(String type, JsonNode settings,
            List<QuestionParts.Option> options, List<QuestionParts.MatchingPair> pairs,
            List<QuestionParts.DragItem> items, List<QuestionParts.ClozeSubAnswer> cloze) {
        return new QuestionDetailDto(QID, type, "Q", "stem", 1L, "cat", null, null, null, null,
                null, BigDecimal.ONE, settings, List.of(), options, pairs, items, List.of(), cloze,
                null);
    }

    @Test
    void multipleChoiceCorrectSelectionIsGraded() {
        var options = List.of(
                new QuestionParts.Option(10L, "China", true, null, 0),
                new QuestionParts.Option(11L, "Brazil", false, null, 1));
        stub(dto("MULTIPLE_CHOICE", null, options, null, null, null));

        var right = gradingService.grade(QID, json.readTree("{\"selectedOptionIds\":[10]}"));
        var wrong = gradingService.grade(QID, json.readTree("{\"selectedOptionIds\":[11]}"));

        assertThat(right.autoGraded()).isTrue();
        assertThat(right.correct()).isTrue();
        assertThat(wrong.correct()).isFalse();
    }

    @Test
    void trueFalseNotGivenSingleSelection() {
        var options = List.of(
                new QuestionParts.Option(20L, "True", true, null, 0),
                new QuestionParts.Option(21L, "False", false, null, 1),
                new QuestionParts.Option(22L, "Not Given", false, null, 2));
        stub(dto("TRUE_FALSE_NOT_GIVEN", null, options, null, null, null));

        var right = gradingService.grade(QID, json.readTree("{\"selectedOptionId\":20}"));
        var wrong = gradingService.grade(QID, json.readTree("{\"selectedOptionId\":21}"));

        assertThat(right.correct()).isTrue();
        assertThat(wrong.correct()).isFalse();
    }

    @Test
    void shortAnswerIsCaseInsensitiveByDefault() {
        JsonNode settings = json.readTree(
                "{\"acceptedAnswers\":[\"water\",\"leaves\"],\"caseSensitive\":false}");
        stub(dto("SHORT_ANSWER", settings, null, null, null, null));

        var right = gradingService.grade(QID, json.readTree("{\"text\":\"Water\"}"));
        var wrong = gradingService.grade(QID, json.readTree("{\"text\":\"tea\"}"));

        assertThat(right.correct()).isTrue();
        assertThat(wrong.correct()).isFalse();
    }

    @Test
    void matchingRequiresAllPairsCorrect() {
        var pairs = List.of(
                new QuestionParts.MatchingPair(1L, "Japan", "Green tea", 0, null, null),
                new QuestionParts.MatchingPair(2L, "England", "Black tea", 1, null, null));
        stub(dto("MATCHING", null, null, pairs, null, null));

        var allCorrect = gradingService.grade(QID,
                json.readTree("{\"matches\":{\"1\":\"Green tea\",\"2\":\"Black tea\"}}"));
        var oneWrong = gradingService.grade(QID,
                json.readTree("{\"matches\":{\"1\":\"Black tea\",\"2\":\"Black tea\"}}"));

        assertThat(allCorrect.correct()).isTrue();
        assertThat(oneWrong.correct()).isFalse();
    }

    @Test
    void clozeRequiresAllSubAnswersCorrect() {
        var subs = List.of(
                new QuestionParts.ClozeSubAnswer(1L, 1, "TEXT",
                        json.readTree("[\"Paris\"]"), null, 0),
                new QuestionParts.ClozeSubAnswer(2L, 2, "SELECT",
                        json.readTree("[\"a city\"]"), json.readTree("[\"a city\",\"a river\"]"), 1));
        stub(dto("CLOZE", null, null, null, null, subs));

        var right = gradingService.grade(QID,
                json.readTree("{\"subs\":{\"1\":\"Paris\",\"2\":\"a city\"}}"));
        var wrong = gradingService.grade(QID,
                json.readTree("{\"subs\":{\"1\":\"Paris\",\"2\":\"a river\"}}"));

        assertThat(right.correct()).isTrue();
        assertThat(wrong.correct()).isFalse();
    }

    @Test
    void dragDropTextRequiresAllItemsAtCorrectTarget() {
        var items = List.of(
                new QuestionParts.DragItem(101L, "Earth", "1", 0),
                new QuestionParts.DragItem(102L, "Sun", "2", 1));
        stub(dto("DRAG_DROP_TEXT", null, null, null, items, null));

        var right = gradingService.grade(QID,
                json.readTree("{\"placements\":{\"101\":\"1\",\"102\":\"2\"}}"));
        var wrong = gradingService.grade(QID,
                json.readTree("{\"placements\":{\"101\":\"2\",\"102\":\"1\"}}"));

        assertThat(right.correct()).isTrue();
        assertThat(wrong.correct()).isFalse();
    }

    @Test
    void essayIsNeverAutoGraded() {
        stub(dto("ESSAY", null, null, null, null, null));

        var result = gradingService.grade(QID, json.readTree("{\"text\":\"my essay\"}"));

        assertThat(result.autoGraded()).isFalse();
        assertThat(result.correct()).isNull();
    }
}
