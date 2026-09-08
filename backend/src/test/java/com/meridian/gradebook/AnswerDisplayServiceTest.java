package com.meridian.gradebook;

import static org.assertj.core.api.Assertions.assertThat;

import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionParts;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Kiểm tra diễn giải đáp án đúng/đáp án học sinh thành văn bản đọc được, cho
 * từng dạng câu hỏi — cùng cấu trúc response JSON với GradingServiceTest (đọc
 * field y hệt GradingService) nhưng ở đây kiểm nội dung hiển thị, không phải
 * đúng/sai.
 */
class AnswerDisplayServiceTest {

    private final ObjectMapper json = new ObjectMapper();
    private final AnswerDisplayService service = new AnswerDisplayService(json);

    private static final Long QID = 1L;

    private QuestionDetailDto dto(String type, JsonNode settings,
            List<QuestionParts.Option> options, List<QuestionParts.MatchingPair> pairs,
            List<QuestionParts.DragItem> items, List<QuestionParts.ClozeSubAnswer> cloze) {
        return dto(type, settings, options, pairs, items, cloze, List.of());
    }

    private QuestionDetailDto dto(String type, JsonNode settings,
            List<QuestionParts.Option> options, List<QuestionParts.MatchingPair> pairs,
            List<QuestionParts.DragItem> items, List<QuestionParts.ClozeSubAnswer> cloze,
            List<QuestionParts.GridRow> gridRows) {
        return new QuestionDetailDto(QID, type, "Q", "stem", 1L, "cat", null, null, null, null,
                null, BigDecimal.ONE, settings, List.of(), options, pairs, items, List.of(), cloze,
                List.of(), gridRows, null);
    }

    // ---- MULTIPLE_CHOICE ----

    @Test
    void multipleChoiceSingleCorrect_showsSelectedAndCorrectOptionText() {
        var options = List.of(
                new QuestionParts.Option(10L, "China", true, null, 0),
                new QuestionParts.Option(11L, "Brazil", false, null, 1));
        var q = dto("MULTIPLE_CHOICE", null, options, null, null, null);

        var right = service.describe(q, "{\"selectedOptionIds\":[10]}");
        var wrong = service.describe(q, "{\"selectedOptionIds\":[11]}");

        assertThat(right.correctAnswerText()).isEqualTo("China");
        assertThat(right.studentAnswerText()).isEqualTo("China");
        assertThat(wrong.correctAnswerText()).isEqualTo("China");
        assertThat(wrong.studentAnswerText()).isEqualTo("Brazil");
    }

    @Test
    void multipleChoiceTwoCorrectOptions_joinsBothWithSemicolon() {
        var options = List.of(
                new QuestionParts.Option(10L, "Infoterra", true, null, 0),
                new QuestionParts.Option(11L, "RapidEye", true, null, 1),
                new QuestionParts.Option(12L, "Sevepi", false, null, 2));
        var q = dto("MULTIPLE_CHOICE", null, options, null, null, null);

        var oneOfTwo = service.describe(q, "{\"selectedOptionIds\":[10]}");
        var bothCorrect = service.describe(q, "{\"selectedOptionIds\":[11,10]}");

        assertThat(oneOfTwo.correctAnswerText()).isEqualTo("Infoterra; RapidEye");
        assertThat(oneOfTwo.studentAnswerText()).isEqualTo("Infoterra");
        assertThat(bothCorrect.studentAnswerText()).isEqualTo("Infoterra; RapidEye");
    }

    @Test
    void multipleChoiceNoSelection_studentAnswerIsNull() {
        var options = List.of(new QuestionParts.Option(10L, "China", true, null, 0));
        var q = dto("MULTIPLE_CHOICE", null, options, null, null, null);

        var result = service.describe(q, null);

        assertThat(result.correctAnswerText()).isEqualTo("China");
        assertThat(result.studentAnswerText()).isNull();
    }

    @Test
    void multipleChoiceOptionHtmlIsStrippedForDisplay() {
        var options = List.of(
                new QuestionParts.Option(10L, "<p><strong>China</strong></p>", true, null, 0));
        var q = dto("MULTIPLE_CHOICE", null, options, null, null, null);

        var result = service.describe(q, "{\"selectedOptionIds\":[10]}");

        assertThat(result.correctAnswerText()).isEqualTo("China");
        assertThat(result.studentAnswerText()).isEqualTo("China");
    }

    // ---- TRUE_FALSE_NOT_GIVEN ----

    @Test
    void trueFalseNotGiven_showsChosenOptionText() {
        var options = List.of(
                new QuestionParts.Option(20L, "True", true, null, 0),
                new QuestionParts.Option(21L, "False", false, null, 1),
                new QuestionParts.Option(22L, "Not Given", false, null, 2));
        var q = dto("TRUE_FALSE_NOT_GIVEN", null, options, null, null, null);

        var right = service.describe(q, "{\"selectedOptionId\":20}");
        var wrong = service.describe(q, "{\"selectedOptionId\":22}");
        var blank = service.describe(q, null);

        assertThat(right.correctAnswerText()).isEqualTo("True");
        assertThat(right.studentAnswerText()).isEqualTo("True");
        assertThat(wrong.studentAnswerText()).isEqualTo("Not Given");
        assertThat(blank.studentAnswerText()).isNull();
    }

    // ---- SHORT_ANSWER ----

    @Test
    void shortAnswer_joinsAcceptedAnswersAndShowsStudentText() {
        JsonNode settings = json.readTree("{\"acceptedAnswers\":[\"water\",\"leaves\"],\"caseSensitive\":false}");
        var q = dto("SHORT_ANSWER", settings, null, null, null, null);

        var answered = service.describe(q, "{\"text\":\"Water\"}");
        var blank = service.describe(q, "{\"text\":\"\"}");

        assertThat(answered.correctAnswerText()).isEqualTo("water / leaves");
        assertThat(answered.studentAnswerText()).isEqualTo("Water");
        assertThat(blank.studentAnswerText()).isNull();
    }

    // ---- MATCHING ----

    @Test
    void matching_listsEachPairAndFlagsUnmatchedAsBlank() {
        var pairs = List.of(
                new QuestionParts.MatchingPair(1L, "Japan", "Green tea", 0, null, null),
                new QuestionParts.MatchingPair(2L, "England", "Black tea", 1, null, null));
        var q = dto("MATCHING", null, null, pairs, null, null);

        var partial = service.describe(q, "{\"matches\":{\"1\":\"Green tea\"}}");

        assertThat(partial.correctAnswerText()).isEqualTo("Japan → Green tea\nEngland → Black tea");
        assertThat(partial.studentAnswerText()).isEqualTo("Japan → Green tea\nEngland → (bỏ trống)");
    }

    // ---- CLOZE ----

    @Test
    void cloze_numbersEachBlankAndFlagsUnfilledAsBlank() {
        var subs = List.of(
                new QuestionParts.ClozeSubAnswer(1L, 1, "TEXT", json.readTree("[\"Paris\"]"), null, 0, false),
                new QuestionParts.ClozeSubAnswer(2L, 2, "TEXT", json.readTree("[\"a city\",\"a town\"]"), null, 1, false));
        var q = dto("CLOZE", null, null, null, null, subs);

        var partial = service.describe(q, "{\"subs\":{\"1\":\"Paris\"}}");

        assertThat(partial.correctAnswerText()).isEqualTo("Ô 1: Paris\nÔ 2: a city / a town");
        assertThat(partial.studentAnswerText()).isEqualTo("Ô 1: Paris\nÔ 2: (bỏ trống)");
    }

    // ---- DRAG_DROP_TEXT / DRAG_DROP_MARKER ----

    @Test
    void dragDrop_showsItemContentStrippedOfHtmlAndTarget() {
        var items = List.of(
                new QuestionParts.DragItem(101L, "<em>Earth</em>", "1", 0),
                new QuestionParts.DragItem(102L, "Sun", "2", 1));
        var q = dto("DRAG_DROP_TEXT", null, null, null, items, null);

        var partial = service.describe(q, "{\"placements\":{\"101\":\"1\"}}");

        assertThat(partial.correctAnswerText()).isEqualTo("Earth → 1\nSun → 2");
        assertThat(partial.studentAnswerText()).isEqualTo("Earth → 1\nSun → (bỏ trống)");
    }

    @Test
    void dragDropMarkerUsesSameLogicAsDragDropText() {
        var items = List.of(new QuestionParts.DragItem(101L, "Pin A", "zone-1", 0));
        var q = dto("DRAG_DROP_MARKER", null, null, null, items, null);

        var result = service.describe(q, "{\"placements\":{\"101\":\"zone-1\"}}");

        assertThat(result.studentAnswerText()).isEqualTo("Pin A → zone-1");
    }

    @Test
    void dragDrop_blankCorrectTargetIsShownExplicitlyNotAsEmptyString() {
        // Dữ liệu thật trên prod: 1 item Kéo thả không khai báo correctTarget
        // (GradingService chấm "đúng" một cách trùng hợp khi học sinh cũng bỏ
        // trống — chuỗi rỗng so bằng chuỗi rỗng) — hiện rõ thay vì để trống
        // sau "→" trông như lỗi hiển thị.
        var items = List.of(new QuestionParts.DragItem(103L, "Con cá", "", 0));
        var q = dto("DRAG_DROP_TEXT", null, null, null, items, null);

        var result = service.describe(q, "{\"placements\":{}}");

        assertThat(result.correctAnswerText()).isEqualTo("Con cá → (chưa cấu hình đáp án đúng)");
        assertThat(result.studentAnswerText()).isEqualTo("Con cá → (bỏ trống)");
    }

    // ---- GRID_MATCHING ----

    @Test
    void gridMatching_showsRowTextAndChosenColumn() {
        var rows = List.of(
                new QuestionParts.GridRow(1L, "Cat", "A", 0),
                new QuestionParts.GridRow(2L, "Dog", "B", 1));
        var q = dto("GRID_MATCHING", null, null, null, null, null, rows);

        var partial = service.describe(q, "{\"choices\":{\"1\":\"A\"}}");

        assertThat(partial.correctAnswerText()).isEqualTo("Cat → A\nDog → B");
        assertThat(partial.studentAnswerText()).isEqualTo("Cat → A\nDog → (bỏ trống)");
    }

    // ---- ESSAY ----

    @Test
    void essay_hasNoCorrectAnswerButShowsWrittenText() {
        var q = dto("ESSAY", null, null, null, null, null);

        var written = service.describe(q, "{\"text\":\"My essay content.\"}");
        var blank = service.describe(q, "{\"text\":\"   \"}");
        var noResponse = service.describe(q, null);

        assertThat(written.correctAnswerText()).isNull();
        assertThat(written.studentAnswerText()).isEqualTo("My essay content.");
        assertThat(blank.studentAnswerText()).isNull();
        assertThat(noResponse.studentAnswerText()).isNull();
    }

    // ---- unknown type / malformed response ----

    @Test
    void unknownType_returnsBothNull() {
        var q = dto("SOME_FUTURE_TYPE", null, null, null, null, null);

        var result = service.describe(q, "{\"text\":\"whatever\"}");

        assertThat(result.correctAnswerText()).isNull();
        assertThat(result.studentAnswerText()).isNull();
    }

    @Test
    void malformedResponseJson_isTreatedAsNoResponse() {
        var options = List.of(new QuestionParts.Option(10L, "China", true, null, 0));
        var q = dto("MULTIPLE_CHOICE", null, options, null, null, null);

        var result = service.describe(q, "not valid json{{{");

        assertThat(result.correctAnswerText()).isEqualTo("China");
        assertThat(result.studentAnswerText()).isNull();
    }
}
