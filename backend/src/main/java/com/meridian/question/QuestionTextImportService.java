package com.meridian.question;

import com.meridian.common.ApiException;
import com.meridian.question.dto.QuestionParts;
import com.meridian.question.dto.QuestionUpsertRequest;
import com.meridian.question.dto.TextImportSummaryDto;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Nhập nhanh câu hỏi Trắc nghiệm (MCQ) từ văn bản thô dán vào — mỗi câu là 1
 * block cách nhau bởi dòng trống: đề bài (nhiều dòng) -> các dòng "A. nội
 * dung" -> 1 dòng "ANSWER: <chữ cái>". Không viết lại logic tạo câu hỏi, chỉ
 * parse rồi gọi lại {@link QuestionService#createQuestion}.
 */
@Service
public class QuestionTextImportService {

    private static final Pattern OPTION_LINE = Pattern.compile("^([A-Za-z])[.)]\\s*(.+)$");
    private static final Pattern ANSWER_LINE =
            Pattern.compile("^ANSWER:\\s*([A-Za-z])\\s*$", Pattern.CASE_INSENSITIVE);
    private static final int NAME_MAX_LEN = 60;

    private final QuestionService questionService;

    public QuestionTextImportService(QuestionService questionService) {
        this.questionService = questionService;
    }

    public TextImportSummaryDto importMcqText(UUID userId, Long categoryId, Audience audience,
            String text) {
        List<TextImportSummaryDto.BlockError> errors = new ArrayList<>();
        int created = 0;

        String normalized = text.replace("\r\n", "\n");
        String[] blocks = normalized.split("\n\\s*\n+");
        int blockIndex = 0;
        for (String rawBlock : blocks) {
            blockIndex++;
            String block = rawBlock.trim();
            if (block.isEmpty()) continue;
            try {
                createFromBlock(userId, categoryId, audience, block);
                created++;
            } catch (BlockParseException e) {
                errors.add(new TextImportSummaryDto.BlockError(blockIndex, excerpt(block), e.getMessage()));
            } catch (ApiException e) {
                errors.add(new TextImportSummaryDto.BlockError(blockIndex, excerpt(block), e.getMessage()));
            }
        }
        return new TextImportSummaryDto(created, errors);
    }

    private void createFromBlock(UUID userId, Long categoryId, Audience audience, String block) {
        List<String> stemLines = new ArrayList<>();
        List<String[]> optionLines = new ArrayList<>(); // [letter, content]
        String answerLetter = null;

        for (String line : block.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            Matcher answerMatcher = ANSWER_LINE.matcher(trimmed);
            if (answerMatcher.matches()) {
                answerLetter = answerMatcher.group(1).toUpperCase();
                continue;
            }
            Matcher optionMatcher = OPTION_LINE.matcher(trimmed);
            if (optionMatcher.matches()) {
                optionLines.add(new String[] {optionMatcher.group(1).toUpperCase(), optionMatcher.group(2).trim()});
                continue;
            }
            stemLines.add(trimmed);
        }

        if (stemLines.isEmpty()) {
            throw new BlockParseException("Không tìm thấy nội dung đề bài");
        }
        if (optionLines.isEmpty()) {
            throw new BlockParseException("Không tìm thấy đáp án dạng \"A. nội dung\"");
        }
        if (answerLetter == null) {
            throw new BlockParseException("Không tìm thấy dòng ANSWER: <chữ cái>");
        }
        final String finalAnswerLetter = answerLetter;
        if (optionLines.stream().noneMatch(o -> o[0].equals(finalAnswerLetter))) {
            throw new BlockParseException(
                    "Chữ cái đáp án \"" + answerLetter + "\" không khớp lựa chọn nào");
        }

        String stem = String.join("<br>", stemLines);
        String name = plainExcerpt(String.join(" ", stemLines), NAME_MAX_LEN);

        List<QuestionParts.Option> options = new ArrayList<>();
        int sort = 0;
        for (String[] o : optionLines) {
            options.add(new QuestionParts.Option(null, o[1], o[0].equals(finalAnswerLetter), null, sort++));
        }

        QuestionUpsertRequest req = new QuestionUpsertRequest(
                categoryId, "MULTIPLE_CHOICE", name, stem, null, null, null,
                BigDecimal.ONE, null, List.of(), options, null, null, null, null);
        questionService.createQuestion(userId, req);
    }

    private String excerpt(String block) {
        return plainExcerpt(block.replace("\n", " "), NAME_MAX_LEN);
    }

    private String plainExcerpt(String text, int maxLen) {
        String t = text.trim();
        return t.length() > maxLen ? t.substring(0, maxLen) + "…" : t;
    }

    private static final class BlockParseException extends RuntimeException {
        BlockParseException(String message) {
            super(message);
        }
    }
}
