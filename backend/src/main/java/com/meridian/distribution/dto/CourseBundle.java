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

    /** v2: thêm groupIntro (tiêu đề nhóm), gridColumns/gridRows (GRID_MATCHING),
     * và masterId (nhận diện câu hỏi ổn định qua các lần gửi lại) — trước đó
     * cả 3 đều bị rơi mất khi điều phối sang web con. */
    public static final int FORMAT_VERSION = 2;

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

    /** {@code questionRef} trỏ tới {@link QuestionBundle#refId()}; {@code pageNumber} null nếu câu hỏi không thuộc trang nào.
     * {@code groupIntro} là đoạn hướng dẫn dùng chung cho nhóm câu hỏi (xem
     * {@code quiz_questions.group_intro}) — gắn với LƯỢT gán câu hỏi này vào
     * quiz này (không phải nội dung câu hỏi dùng chung ở ngân hàng), null nếu
     * câu hỏi không mở đầu nhóm nào. */
    public record QuizQuestionBundle(
            String questionRef, BigDecimal mark, Integer pageNumber, int sortOrder, String groupIntro) {
    }

    /**
     * {@code refId} là khóa cục bộ trong gói (không phải id thật) — nhiều câu hỏi có thể dùng chung
     * 1 danh mục/passage. {@code parentRef} trỏ tới {@code refId} của 1 danh mục khác TRONG CÙNG gói
     * này, đứng trước nó trong {@link Manifest#questionCategories()} (danh mục cha phải được liệt kê
     * trước danh mục con) — null nếu là danh mục gốc (không có cha).
     */
    public record QuestionCategoryBundle(String refId, String name, String description, String parentRef) {
    }

    public record PassageBundle(String refId, String title, String kind, String content, String audioUrl) {
    }

    /** {@code masterId} là ID THẬT (không phải refId cục bộ trong gói) của câu
     * hỏi này bên web tổng — web con lưu lại (xem {@code questions.master_question_id})
     * để nhận diện đúng ở lần gửi lại (resend) kể cả khi câu hỏi đã bị đổi
     * tên bên web tổng, tránh tạo bản trùng thay vì cập nhật. */
    public record QuestionBundle(
            String refId,
            Long masterId,
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
            List<QuestionParts.ClozeSubAnswer> clozeSubAnswers,
            List<QuestionParts.GridColumn> gridColumns,
            List<QuestionParts.GridRow> gridRows) {
    }
}
