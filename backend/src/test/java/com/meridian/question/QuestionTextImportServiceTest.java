package com.meridian.question;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.meridian.question.dto.QuestionParts;
import com.meridian.question.dto.QuestionUpsertRequest;
import com.meridian.question.dto.TextImportSummaryDto;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QuestionTextImportServiceTest {

    @Mock
    private QuestionService questionService;

    @Captor
    private ArgumentCaptor<QuestionUpsertRequest> reqCaptor;

    private static final UUID UID = UUID.randomUUID();
    private static final Long CATEGORY_ID = 5L;

    @Test
    void parsesValidBlocksAndCreatesQuestions() {
        String text = """
                What is the capital of France?
                A. Paris
                B. London
                C. Rome
                ANSWER: A

                Which gas do plants absorb?
                A. Oxygen
                B. Carbon dioxide
                C. Nitrogen
                ANSWER: b

                Water boils at what temperature (Celsius)?
                A. 50
                B. 90
                C. 100
                ANSWER: C
                """;

        QuestionTextImportService service = new QuestionTextImportService(questionService);
        TextImportSummaryDto summary = service.importMcqText(UID, CATEGORY_ID, Audience.IELTS, text);

        assertThat(summary.questionsCreated()).isEqualTo(3);
        assertThat(summary.errors()).isEmpty();

        verify(questionService, org.mockito.Mockito.times(3))
                .createQuestion(eq(UID), reqCaptor.capture());
        var requests = reqCaptor.getAllValues();

        assertThat(requests.get(0).type()).isEqualTo("MULTIPLE_CHOICE");
        assertThat(requests.get(0).categoryId()).isEqualTo(CATEGORY_ID);
        assertThat(requests.get(0).options()).hasSize(3);
        assertThat(requests.get(0).options().stream().filter(QuestionParts.Option::correct)
                .map(QuestionParts.Option::content))
                .containsExactly("Paris");

        // "ANSWER: b" (lowercase) trên block 2 vẫn khớp đúng lựa chọn B — không phân biệt hoa/thường.
        assertThat(requests.get(1).options().stream().filter(QuestionParts.Option::correct)
                .map(QuestionParts.Option::content))
                .containsExactly("Carbon dioxide");
    }

    @Test
    void reportsErrorForBlockMissingAnswerLineButKeepsValidOnesGoing() {
        String text = """
                First question, valid.
                A. Alpha
                B. Beta
                ANSWER: A

                Second question missing the ANSWER line.
                A. One
                B. Two
                """;

        QuestionTextImportService service = new QuestionTextImportService(questionService);
        TextImportSummaryDto summary = service.importMcqText(UID, CATEGORY_ID, Audience.IELTS, text);

        assertThat(summary.questionsCreated()).isEqualTo(1);
        assertThat(summary.errors()).hasSize(1);
        assertThat(summary.errors().get(0).blockIndex()).isEqualTo(2);
        assertThat(summary.errors().get(0).reason()).contains("ANSWER");

        verify(questionService, org.mockito.Mockito.times(1)).createQuestion(eq(UID), any());
    }

    @Test
    void reportsErrorWhenAnswerLetterDoesNotMatchAnyOption() {
        String text = """
                A question with a bad answer letter.
                A. One
                B. Two
                ANSWER: Z
                """;

        QuestionTextImportService service = new QuestionTextImportService(questionService);
        TextImportSummaryDto summary = service.importMcqText(UID, CATEGORY_ID, Audience.IELTS, text);

        assertThat(summary.questionsCreated()).isEqualTo(0);
        assertThat(summary.errors()).hasSize(1);
        assertThat(summary.errors().get(0).reason()).contains("Z");
    }
}
