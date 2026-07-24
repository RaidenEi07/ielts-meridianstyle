package com.meridian.distribution;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseCategory;
import com.meridian.catalog.CourseCategoryRepository;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.catalog.CatalogService;
import com.meridian.catalog.CourseAudienceGroup;
import com.meridian.catalog.dto.CategoryDto;
import com.meridian.catalog.dto.CategoryRequests;
import com.meridian.catalog.dto.CourseDetailDto;
import com.meridian.catalog.dto.CourseRequests;
import com.meridian.catalog.dto.SectionDto;
import com.meridian.common.ApiException;
import com.meridian.distribution.dto.CourseBundle;
import com.meridian.distribution.dto.CourseImportSummaryDto;
import com.meridian.question.Passage;
import com.meridian.question.PassageRepository;
import com.meridian.question.Question;
import com.meridian.question.QuestionCategory;
import com.meridian.question.QuestionCategoryRepository;
import com.meridian.question.QuestionRepository;
import com.meridian.question.QuestionService;
import com.meridian.question.QuestionTaxonomyService;
import com.meridian.question.dto.PassageDto;
import com.meridian.question.dto.QuestionBankRequests;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionUpsertRequest;
import com.meridian.quiz.Quiz;
import com.meridian.quiz.QuizRepository;
import com.meridian.quiz.QuizService;
import com.meridian.quiz.dto.QuizDtos.QuizDetailDto;
import com.meridian.quiz.dto.QuizDtos.QuizPageDto;
import com.meridian.quiz.dto.QuizRequests;
import com.meridian.user.UserRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nhận 1 khóa học được điều phối từ web tổng và tạo/cập nhật lại trên web con — tái sử dụng
 * theo tên/shortname ở mọi cấp (danh mục, khóa học, section, quiz, danh mục câu hỏi, passage,
 * câu hỏi) để gửi lại cùng 1 khóa học nhiều lần chỉ cập nhật thay vì tạo trùng. Toàn bộ việc
 * ghi DB đi qua đúng các service hiện có ({@link CatalogService}, {@link QuizService},
 * {@link QuestionService}, {@link QuestionTaxonomyService}) — không viết logic ghi DB riêng.
 *
 * <p>Các service đó đòi hỏi 1 UUID người dùng thật để kiểm tra quyền {@code course:manage}; vì
 * request này xác thực bằng API key (không có người dùng đăng nhập), ta mượn tài khoản admin
 * mặc định của chính deployment này làm actor — admin luôn có đủ quyền hệ thống theo đúng seed
 * RBAC dùng chung giữa web tổng/web con.
 */
@Service
public class CourseImportService {

    private final CourseCategoryRepository courseCategoryRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final QuizRepository quizRepository;
    private final QuestionCategoryRepository questionCategoryRepository;
    private final PassageRepository passageRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final CatalogService catalogService;
    private final QuizService quizService;
    private final QuestionService questionService;
    private final QuestionTaxonomyService questionTaxonomyService;
    private final Environment env;

    public CourseImportService(CourseCategoryRepository courseCategoryRepository,
            CourseRepository courseRepository, CourseSectionRepository sectionRepository,
            QuizRepository quizRepository, QuestionCategoryRepository questionCategoryRepository,
            PassageRepository passageRepository, QuestionRepository questionRepository,
            UserRepository userRepository, CatalogService catalogService, QuizService quizService,
            QuestionService questionService, QuestionTaxonomyService questionTaxonomyService,
            Environment env) {
        this.courseCategoryRepository = courseCategoryRepository;
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.quizRepository = quizRepository;
        this.questionCategoryRepository = questionCategoryRepository;
        this.passageRepository = passageRepository;
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.catalogService = catalogService;
        this.quizService = quizService;
        this.questionService = questionService;
        this.questionTaxonomyService = questionTaxonomyService;
        this.env = env;
    }

    @Transactional
    public CourseImportSummaryDto importCourse(CourseBundle.Manifest manifest) {
        UUID actorId = resolveActorId();
        List<String> warnings = new ArrayList<>();

        boolean categoryReused;
        CourseCategory category;
        Optional<CourseCategory> existingCategory =
                courseCategoryRepository.findByNameIgnoreCase(manifest.category().name());
        if (existingCategory.isPresent()) {
            category = existingCategory.get();
            categoryReused = true;
        } else {
            CategoryDto created = catalogService.createCategory(actorId, new CategoryRequests.Create(
                    manifest.category().name(), null, manifest.category().description(),
                    manifest.category().examTemplateCode(),
                    parseAudienceGroup(manifest.category().audienceGroup())));
            category = courseCategoryRepository.findById(created.id()).orElseThrow();
            categoryReused = false;
        }

        CourseBundle.CourseInfoBundle cb = manifest.course();
        boolean courseCreated;
        Long courseId;
        Optional<Course> existingCourse = courseRepository.findByShortname(cb.shortname());
        if (existingCourse.isPresent()) {
            courseId = existingCourse.get().getId();
            catalogService.updateCourse(actorId, courseId, new CourseRequests.UpdateCourse(
                    category.getId(), cb.title(), cb.summary(), cb.coverImageUrl(), cb.price(),
                    cb.status(), cb.descriptionHtml(), cb.objectives(), cb.prerequisites()));
            courseCreated = false;
        } else {
            CourseDetailDto created = catalogService.createCourse(actorId, new CourseRequests.CreateCourse(
                    category.getId(), cb.title(), cb.shortname(), cb.summary(), cb.coverImageUrl(),
                    cb.price(), cb.status(), cb.descriptionHtml(), cb.objectives(), cb.prerequisites()));
            courseId = created.id();
            courseCreated = true;
        }

        Map<String, Long> questionCategoryIdByRef = new HashMap<>();
        int qCategoriesCreated = 0;
        int qCategoriesReused = 0;
        for (CourseBundle.QuestionCategoryBundle qc : manifest.questionCategories()) {
            Optional<QuestionCategory> existing = questionCategoryRepository.findByNameIgnoreCase(qc.name());
            if (existing.isPresent()) {
                questionCategoryIdByRef.put(qc.refId(), existing.get().getId());
                qCategoriesReused++;
            } else {
                QuestionCategoryDto created = questionTaxonomyService.createCategory(
                        new QuestionBankRequests.CreateCategory(qc.name(), null, qc.description(), null));
                questionCategoryIdByRef.put(qc.refId(), created.id());
                qCategoriesCreated++;
            }
        }

        Map<String, Long> passageIdByRef = new HashMap<>();
        int passagesCreated = 0;
        int passagesReused = 0;
        for (CourseBundle.PassageBundle pb : manifest.passages()) {
            Optional<Passage> existing = passageRepository.findByTitleIgnoreCase(pb.title());
            if (existing.isPresent()) {
                passageIdByRef.put(pb.refId(), existing.get().getId());
                passagesReused++;
            } else {
                PassageDto created = questionTaxonomyService.createPassage(
                        new QuestionBankRequests.UpsertPassage(pb.title(), pb.kind(), pb.content(), pb.audioUrl()));
                passageIdByRef.put(pb.refId(), created.id());
                passagesCreated++;
            }
        }

        Map<String, Long> questionIdByRef = new HashMap<>();
        int questionsCreated = 0;
        int questionsReused = 0;
        for (CourseBundle.QuestionBundle qb : manifest.questions()) {
            Long categoryId = qb.categoryRef() != null ? questionCategoryIdByRef.get(qb.categoryRef()) : null;
            if (categoryId == null) {
                warnings.add("Bỏ qua câu hỏi \"" + qb.name() + "\": thiếu danh mục câu hỏi");
                continue;
            }
            Optional<Question> existing =
                    questionRepository.findByCategoryIdAndNameIgnoreCase(categoryId, qb.name());
            if (existing.isPresent()) {
                questionIdByRef.put(qb.refId(), existing.get().getId());
                questionsReused++;
                continue;
            }
            Long passageId = qb.passageRef() != null ? passageIdByRef.get(qb.passageRef()) : null;
            try {
                QuestionUpsertRequest req = new QuestionUpsertRequest(
                        categoryId, qb.type(), qb.name(), qb.stem(), passageId, qb.answerParagraphIndex(),
                        qb.explanation(), qb.defaultMark(), qb.settings(), qb.tags(), qb.options(),
                        qb.matchingPairs(), qb.dragItems(), qb.dragZones(), qb.clozeSubAnswers());
                QuestionDetailDto created = questionService.createQuestion(actorId, req);
                questionIdByRef.put(qb.refId(), created.id());
                questionsCreated++;
            } catch (ApiException e) {
                warnings.add("Bỏ qua câu hỏi \"" + qb.name() + "\": " + e.getMessage());
            }
        }

        int sectionsCreated = 0;
        int sectionsReused = 0;
        int quizzesCreated = 0;
        int quizzesReused = 0;
        List<CourseSection> existingSections = sectionRepository.findByCourseIdOrderBySortOrderAscIdAsc(courseId);
        for (CourseBundle.SectionBundle sb : manifest.sections()) {
            CourseSection matchedSection = existingSections.stream()
                    .filter(s -> s.getTitle().equalsIgnoreCase(sb.title()))
                    .findFirst().orElse(null);
            Long sectionId;
            if (matchedSection != null) {
                catalogService.updateSection(actorId, matchedSection.getId(), new CourseRequests.UpdateSection(
                        sb.title(), sb.sortOrder(), sb.videoUrl(), sb.subtitleUrl(), sb.shortDescription()));
                sectionId = matchedSection.getId();
                sectionsReused++;
            } else {
                SectionDto created = catalogService.createSection(actorId, courseId, new CourseRequests.CreateSection(
                        sb.title(), sb.sortOrder(), sb.videoUrl(), sb.subtitleUrl(), sb.shortDescription()));
                sectionId = created.id();
                sectionsCreated++;
            }

            List<Quiz> existingQuizzes = quizRepository.findBySectionIdOrderBySortOrderAscIdAsc(sectionId);
            for (CourseBundle.QuizBundle qb : sb.quizzes()) {
                Quiz matchedQuiz = existingQuizzes.stream()
                        .filter(q -> q.getTitle().equalsIgnoreCase(qb.title()))
                        .findFirst().orElse(null);
                Long quizId;
                if (matchedQuiz != null) {
                    quizService.updateQuiz(actorId, matchedQuiz.getId(), new QuizRequests.UpdateQuiz(
                            qb.title(), qb.intro(), qb.timeLimitSeconds(), qb.maxAttempts(),
                            qb.shuffleQuestions(), qb.antiCheatEnabled(), qb.maxViolations(),
                            qb.passMark(), qb.status()));
                    quizId = matchedQuiz.getId();
                    quizzesReused++;
                } else {
                    QuizDetailDto created = quizService.createQuiz(actorId, new QuizRequests.CreateQuiz(
                            sectionId, qb.title(), qb.intro(), qb.timeLimitSeconds(), qb.maxAttempts(),
                            qb.shuffleQuestions(), qb.antiCheatEnabled(), qb.maxViolations(),
                            qb.passMark(), qb.status()));
                    quizId = created.quiz().id();
                    quizzesCreated++;
                }

                Map<Integer, Long> pageIdByNumber = new HashMap<>();
                for (CourseBundle.QuizPageBundle pb : qb.pages()) {
                    Long passageId = pb.passageRef() != null ? passageIdByRef.get(pb.passageRef()) : null;
                    QuizPageDto page = quizService.setPage(actorId, quizId,
                            new QuizRequests.SetPage(pb.pageNumber(), pb.partLabel(), passageId));
                    pageIdByNumber.put(pb.pageNumber(), page.id());
                }

                for (CourseBundle.QuizQuestionBundle qqb : qb.questions()) {
                    Long questionId = questionIdByRef.get(qqb.questionRef());
                    if (questionId == null) {
                        continue;
                    }
                    Long pageId = qqb.pageNumber() != null ? pageIdByNumber.get(qqb.pageNumber()) : null;
                    quizService.importQuestions(actorId, quizId,
                            new QuizRequests.ImportQuestions(List.of(questionId), pageId, qqb.mark()));
                }
            }
        }

        return new CourseImportSummaryDto(
                categoryReused ? 0 : 1, categoryReused ? 1 : 0,
                courseCreated,
                sectionsCreated, sectionsReused,
                quizzesCreated, quizzesReused,
                qCategoriesCreated, qCategoriesReused,
                passagesCreated, passagesReused,
                questionsCreated, questionsReused,
                warnings);
    }

    private UUID resolveActorId() {
        String adminUsername = env.getProperty("ADMIN_USERNAME", "admin");
        return userRepository.findByUsernameIgnoreCase(adminUsername)
                .orElseThrow(() -> ApiException.badRequest(
                        "Không tìm thấy tài khoản admin để nhập khóa học"))
                .getId();
    }

    private CourseAudienceGroup parseAudienceGroup(String raw) {
        if (raw == null || raw.isBlank()) {
            return CourseAudienceGroup.IELTS;
        }
        try {
            return CourseAudienceGroup.valueOf(raw);
        } catch (IllegalArgumentException e) {
            return CourseAudienceGroup.IELTS;
        }
    }
}
