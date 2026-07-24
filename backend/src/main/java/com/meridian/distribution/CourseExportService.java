package com.meridian.distribution;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseCategory;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.common.ApiException;
import com.meridian.distribution.dto.CourseBundle;
import com.meridian.question.Passage;
import com.meridian.question.PassageRepository;
import com.meridian.question.QuestionCategory;
import com.meridian.question.QuestionCategoryRepository;
import com.meridian.question.QuestionService;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.quiz.Quiz;
import com.meridian.quiz.QuizPage;
import com.meridian.quiz.QuizPageRepository;
import com.meridian.quiz.QuizQuestion;
import com.meridian.quiz.QuizQuestionRepository;
import com.meridian.quiz.QuizRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** Lắp ráp 1 {@link CourseBundle.Manifest} đầy đủ từ 1 khóa học thật, để gửi tới web con (Lát 3/4). */
@Service
public class CourseExportService {

    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final QuizRepository quizRepository;
    private final QuizPageRepository quizPageRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuestionService questionService;
    private final QuestionCategoryRepository questionCategoryRepository;
    private final PassageRepository passageRepository;
    private final ObjectMapper json;

    public CourseExportService(CourseRepository courseRepository, CourseSectionRepository sectionRepository,
            QuizRepository quizRepository, QuizPageRepository quizPageRepository,
            QuizQuestionRepository quizQuestionRepository, QuestionService questionService,
            QuestionCategoryRepository questionCategoryRepository, PassageRepository passageRepository,
            ObjectMapper json) {
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.quizRepository = quizRepository;
        this.quizPageRepository = quizPageRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.questionService = questionService;
        this.questionCategoryRepository = questionCategoryRepository;
        this.passageRepository = passageRepository;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public CourseBundle.Manifest exportCourse(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khóa học"));
        CourseCategory category = course.getCategory();

        Map<Long, String> passageRefIds = new LinkedHashMap<>();
        List<CourseBundle.PassageBundle> passageBundles = new ArrayList<>();
        Map<Long, String> questionCategoryRefIds = new LinkedHashMap<>();
        List<CourseBundle.QuestionCategoryBundle> categoryBundles = new ArrayList<>();
        Map<Long, String> questionRefIds = new LinkedHashMap<>();
        List<CourseBundle.QuestionBundle> questionBundles = new ArrayList<>();

        List<CourseBundle.SectionBundle> sectionBundles = new ArrayList<>();
        for (CourseSection section : sectionRepository.findByCourseIdOrderBySortOrderAscIdAsc(courseId)) {
            List<CourseBundle.QuizBundle> quizBundles = new ArrayList<>();
            for (Quiz quiz : quizRepository.findBySectionIdOrderBySortOrderAscIdAsc(section.getId())) {
                List<QuizPage> pages = quizPageRepository.findByQuizIdOrderByPageNumberAsc(quiz.getId());
                List<CourseBundle.QuizPageBundle> pageBundles = new ArrayList<>();
                for (QuizPage page : pages) {
                    String passageRef = page.getPassageId() != null
                            ? resolvePassageRef(page.getPassageId(), passageRefIds, passageBundles)
                            : null;
                    pageBundles.add(new CourseBundle.QuizPageBundle(
                            page.getPageNumber(), page.getPartLabel(), passageRef));
                }

                List<CourseBundle.QuizQuestionBundle> qqBundles = new ArrayList<>();
                for (QuizQuestion qq : quizQuestionRepository.findByQuizIdOrderBySortOrderAscIdAsc(quiz.getId())) {
                    String questionRef = resolveQuestionRef(qq.getQuestionId(), questionRefIds, questionBundles,
                            questionCategoryRefIds, categoryBundles, passageRefIds, passageBundles);
                    Integer pageNumber = qq.getPageId() != null ? pageNumberOf(qq.getPageId(), pages) : null;
                    qqBundles.add(new CourseBundle.QuizQuestionBundle(
                            questionRef, qq.getMark(), pageNumber, qq.getSortOrder()));
                }

                quizBundles.add(new CourseBundle.QuizBundle(
                        quiz.getTitle(), quiz.getIntro(), quiz.getTimeLimitSeconds(), quiz.getMaxAttempts(),
                        quiz.isShuffleQuestions(), quiz.isAntiCheatEnabled(), quiz.getMaxViolations(),
                        quiz.getPassMark(), quiz.getStatus().name(), quiz.getSortOrder(),
                        pageBundles, qqBundles));
            }
            sectionBundles.add(new CourseBundle.SectionBundle(
                    section.getTitle(), section.getSortOrder(), section.getVideoUrl(),
                    section.getSubtitleUrl(), section.getShortDescription(), quizBundles));
        }

        CourseBundle.CourseCategoryBundle categoryBundle = new CourseBundle.CourseCategoryBundle(
                category.getName(), category.getSlug(), category.getDescription(),
                category.getAudienceGroup().name(),
                category.getExamTemplate() != null ? category.getExamTemplate().getCode() : null);

        CourseBundle.CourseInfoBundle courseInfo = new CourseBundle.CourseInfoBundle(
                course.getTitle(), course.getShortname(), course.getSummary(), course.getDescriptionHtml(),
                objectivesFromJson(course.getObjectives()), course.getPrerequisites(),
                course.getCoverImageUrl(), course.getPrice(), course.getStatus().name());

        return new CourseBundle.Manifest(CourseBundle.FORMAT_VERSION, categoryBundle, courseInfo,
                sectionBundles, categoryBundles, passageBundles, questionBundles);
    }

    private Integer pageNumberOf(Long pageId, List<QuizPage> pages) {
        return pages.stream().filter(p -> p.getId().equals(pageId))
                .findFirst().map(QuizPage::getPageNumber).orElse(null);
    }

    private String resolvePassageRef(Long passageId, Map<Long, String> refIds,
            List<CourseBundle.PassageBundle> bundles) {
        String existing = refIds.get(passageId);
        if (existing != null) {
            return existing;
        }
        Passage passage = passageRepository.findById(passageId).orElse(null);
        if (passage == null) {
            return null;
        }
        String refId = "p" + (refIds.size() + 1);
        refIds.put(passageId, refId);
        bundles.add(new CourseBundle.PassageBundle(refId, passage.getTitle(), passage.getKind().name(),
                passage.getContent(), passage.getAudioUrl()));
        return refId;
    }

    private String resolveQuestionCategoryRef(Long categoryId, Map<Long, String> refIds,
            List<CourseBundle.QuestionCategoryBundle> bundles) {
        String existing = refIds.get(categoryId);
        if (existing != null) {
            return existing;
        }
        QuestionCategory category = questionCategoryRepository.findById(categoryId).orElse(null);
        String refId = "c" + (refIds.size() + 1);
        refIds.put(categoryId, refId);
        bundles.add(new CourseBundle.QuestionCategoryBundle(refId,
                category != null ? category.getName() : "Chưa phân loại",
                category != null ? category.getDescription() : null));
        return refId;
    }

    private String resolveQuestionRef(Long questionId, Map<Long, String> questionRefIds,
            List<CourseBundle.QuestionBundle> questionBundles, Map<Long, String> categoryRefIds,
            List<CourseBundle.QuestionCategoryBundle> categoryBundles, Map<Long, String> passageRefIds,
            List<CourseBundle.PassageBundle> passageBundles) {
        String existing = questionRefIds.get(questionId);
        if (existing != null) {
            return existing;
        }
        QuestionDetailDto d = questionService.getQuestion(questionId);
        String categoryRef = d.categoryId() != null
                ? resolveQuestionCategoryRef(d.categoryId(), categoryRefIds, categoryBundles)
                : null;
        String passageRef = d.passageId() != null
                ? resolvePassageRef(d.passageId(), passageRefIds, passageBundles)
                : null;

        String refId = "q" + (questionRefIds.size() + 1);
        questionRefIds.put(questionId, refId);
        questionBundles.add(new CourseBundle.QuestionBundle(
                refId, categoryRef, d.type(), d.name(), d.stem(), passageRef, d.answerParagraphIndex(),
                d.explanation(), d.defaultMark(), d.settings(), d.tags(), d.options(), d.matchingPairs(),
                d.dragItems(), d.dragZones(), d.clozeSubAnswers()));
        return refId;
    }

    private List<String> objectivesFromJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(raw, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            return List.of();
        }
    }
}
