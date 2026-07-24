package com.meridian.distribution.dto;

import com.meridian.question.dto.QuestionParts;
import java.math.BigDecimal;
import java.util.List;
import tools.jackson.databind.JsonNode;

/**
 * Định dạng gói xuất/nhập 1 khóa học đầy đủ (course, section, quiz, câu hỏi) để điều phối
 * từ web tổng sang web con. Video/phụ đề section giữ nguyên URL tuyệt đối trỏ về web tổng
 * (v1 không đóng gói file media) — cùng quyết định thiết kế áp dụng cho ảnh/audio trong nội
 * dung câu hỏi (stem/passage), nên gói này là JSON thuần, không cần zip như ngân hàng câu hỏi.
 */
public final class CourseBundle {

    private CourseBundle() {
    }

    public static final int FORMAT_VERSION = 1;

    public record Manifest(
            int formatVersion,
            CourseCategoryBundle category,
            CourseInfoBundle course,
            List<SectionBundle> sections,
            List<QuestionCategoryBundle> questionCategories,
            List<PassageBundle> passages,
            List<QuestionBundle> questions) {
    }

    public record CourseCategoryBundle(
            String name, String slug, String description, String audienceGroup,
            String examTemplateCode) {
    }

    public record CourseInfoBundle(
            String title, String shortname, String summary, String descriptionHtml,
            List<String> objectives, String prerequisites, String coverImageUrl,
            BigDecimal price, String status) {
    }

    public record SectionBundle(
            String title, int sortOrder, String videoUrl, String subtitleUrl,
            String shortDescription, List<QuizBundle> quizzes) {
    }

    public record QuizBundle(
            String title, String intro, Integer timeLimitSeconds, int maxAttempts,
            boolean shuffleQuestions, boolean antiCheatEnabled, int maxViolations,
            BigDecimal passMark, String status, int sortOrder,
            List<QuizPageBundle> pages, List<QuizQuestionBundle> questions) {
    }

    /** {@code passageRef} trỏ tới {@link PassageBundle#refId()}, null nếu trang không gắn passage. */
    public record QuizPageBundle(int pageNumber, String partLabel, String passageRef) {
    }

    /** {@code questionRef} trỏ tới {@link QuestionBundle#refId()}; {@code pageNumber} null nếu câu hỏi không thuộc trang nào. */
    public record QuizQuestionBundle(String questionRef, BigDecimal mark, Integer pageNumber, int sortOrder) {
    }

    /** {@code refId} là khóa cục bộ trong gói (không phải id thật) — nhiều câu hỏi có thể dùng chung 1 danh mục/passage. */
    public record QuestionCategoryBundle(String refId, String name, String description) {
    }

    public record PassageBundle(String refId, String title, String kind, String content, String audioUrl) {
    }

    public record QuestionBundle(
            String refId,
            String categoryRef,
            String type,
            String name,
            String stem,
            String passageRef,
            Integer answerParagraphIndex,
            String explanation,
            BigDecimal defaultMark,
            JsonNode settings,
            List<String> tags,
            List<QuestionParts.Option> options,
            List<QuestionParts.MatchingPair> matchingPairs,
            List<QuestionParts.DragItem> dragItems,
            List<QuestionParts.DragZone> dragZones,
            List<QuestionParts.ClozeSubAnswer> clozeSubAnswers) {
    }
}
