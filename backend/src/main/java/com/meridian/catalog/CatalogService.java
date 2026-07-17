package com.meridian.catalog;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.meridian.catalog.dto.CategoryDto;
import com.meridian.catalog.dto.CategoryRequests;
import com.meridian.catalog.dto.CourseDetailDto;
import com.meridian.catalog.dto.CourseRequests;
import com.meridian.catalog.dto.CourseSummaryDto;
import com.meridian.catalog.dto.ExamTemplateDto;
import com.meridian.catalog.dto.SectionDto;
import com.meridian.common.ApiException;
import com.meridian.common.Slugs;
import com.meridian.quiz.Quiz;
import com.meridian.quiz.QuizRepository;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextType;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import tools.jackson.core.type.TypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nghiệp vụ Khóa học & Category (Giai đoạn 2). Khi tạo Category/Course sẽ sinh
 * context tương ứng để cây RBAC hoạt động ngoài SYSTEM. Mọi thao tác ghi đều
 * kiểm tra capability 'course:manage' tại context phù hợp.
 */
@Service
public class CatalogService {

    private static final String CAP_MANAGE = "course:manage";

    private final CourseCategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final ExamTemplateRepository examTemplateRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final QuizRepository quizRepository;
    private final ContextService contextService;
    private final PermissionService permissionService;
    private final ObjectMapper objectMapper;

    public CatalogService(CourseCategoryRepository categoryRepository,
            CourseRepository courseRepository,
            CourseSectionRepository sectionRepository,
            ExamTemplateRepository examTemplateRepository,
            EnrollmentRepository enrollmentRepository,
            QuizRepository quizRepository,
            ContextService contextService,
            PermissionService permissionService,
            ObjectMapper objectMapper) {
        this.categoryRepository = categoryRepository;
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.examTemplateRepository = examTemplateRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.quizRepository = quizRepository;
        this.contextService = contextService;
        this.permissionService = permissionService;
        this.objectMapper = objectMapper;
    }

    // ================= Exam templates =================

    @Transactional(readOnly = true)
    public List<ExamTemplateDto> listExamTemplates() {
        return examTemplateRepository.findAll().stream()
                .map(this::toTemplateDto).toList();
    }

    private ExamTemplateDto toTemplateDto(ExamTemplate t) {
        return new ExamTemplateDto(t.getId(), t.getCode(), t.getName(),
                parseJson(t.getSkillLayoutConfig()),
                parseJson(t.getTimerRules()),
                parseJson(t.getBandScoreConversion()));
    }

    private JsonNode parseJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private String objectivesToJson(List<String> objectives) {
        if (objectives == null) {
            return null;
        }
        return objectMapper.writeValueAsString(objectives);
    }

    private List<String> objectivesFromJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(raw, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            return List.of();
        }
    }

    // ================= Categories =================

    @Transactional(readOnly = true)
    public List<CategoryDto> listCategories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(CategoryDto::from).toList();
    }

    @Transactional
    public CategoryDto createCategory(UUID userId, CategoryRequests.Create req) {
        permissionService.requireSystemCapability(userId, CAP_MANAGE);

        String slug = (req.slug() == null || req.slug().isBlank())
                ? Slugs.slugify(req.name())
                : Slugs.slugify(req.slug());
        if (slug.isBlank()) {
            throw ApiException.badRequest("Không tạo được slug từ tên danh mục");
        }
        if (categoryRepository.existsBySlug(slug)) {
            throw ApiException.conflict("Slug '" + slug + "' đã tồn tại");
        }

        CourseCategory category = new CourseCategory();
        category.setName(req.name());
        category.setSlug(slug);
        category.setDescription(req.description());
        category.setExamTemplate(resolveTemplate(req.examTemplateCode()));
        category.setAudienceGroup(req.audienceGroup() != null ? req.audienceGroup() : CourseAudienceGroup.IELTS);
        category = categoryRepository.saveAndFlush(category);

        // Tạo CATEGORY context (con của SYSTEM) và gắn vào category.
        Context systemCtx = contextService.requireSystemContext();
        Context ctx = contextService.createContext(
                ContextType.CATEGORY, category.getId(), systemCtx);
        category.setContext(ctx);

        return CategoryDto.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDto updateCategory(UUID userId, Long id, CategoryRequests.Update req) {
        CourseCategory category = getCategory(id);
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(category.getContext()));

        if (req.name() != null && !req.name().isBlank()) {
            category.setName(req.name());
        }
        if (req.description() != null) {
            category.setDescription(req.description());
        }
        if (req.examTemplateCode() != null) {
            category.setExamTemplate(
                    req.examTemplateCode().isBlank() ? null : resolveTemplate(req.examTemplateCode()));
        }
        if (req.audienceGroup() != null) {
            category.setAudienceGroup(req.audienceGroup());
        }
        return CategoryDto.from(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(UUID userId, Long id) {
        CourseCategory category = getCategory(id);
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(category.getContext()));
        category.setDeletedAt(java.time.Instant.now());
        categoryRepository.save(category);
    }

    // ================= Courses =================

    @Transactional(readOnly = true)
    public List<CourseSummaryDto> listPublishedCourses(Long categoryId) {
        return listPublishedCourses(categoryId, null);
    }

    @Transactional(readOnly = true)
    public List<CourseSummaryDto> listPublishedCourses(Long categoryId, CourseAudienceGroup audienceGroup) {
        List<Course> courses;
        if (categoryId != null) {
            courses = courseRepository.findByCategoryIdAndStatusOrderByCreatedAtDesc(
                    categoryId, CourseStatus.PUBLISHED);
        } else if (audienceGroup != null) {
            courses = courseRepository.findByCategory_AudienceGroupAndStatusOrderByCreatedAtDesc(
                    audienceGroup, CourseStatus.PUBLISHED);
        } else {
            courses = courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED);
        }
        return courses.stream()
                .map(c -> CourseSummaryDto.from(c, enrollmentRepository.countByCourseId(c.getId())))
                .toList();
    }

    /**
     * Liệt kê khóa học cho màn quản trị — trả về MỌI trạng thái (kể cả DRAFT),
     * khác với {@link #listPublishedCourses} (chỉ PUBLISHED, dùng cho trang công khai).
     */
    @Transactional(readOnly = true)
    public List<CourseSummaryDto> listCoursesForManagement(UUID userId, Long categoryId) {
        if (categoryId != null) {
            CourseCategory category = getCategory(categoryId);
            permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(category.getContext()));
            return courseRepository.findByCategoryIdOrderByCreatedAtDesc(categoryId).stream()
                    .map(c -> CourseSummaryDto.from(c, enrollmentRepository.countByCourseId(c.getId())))
                    .toList();
        }
        permissionService.requireSystemCapability(userId, CAP_MANAGE);
        return courseRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(c -> CourseSummaryDto.from(c, enrollmentRepository.countByCourseId(c.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseDetailDto getCourseDetail(Long id) {
        Course course = getCourse(id);
        return buildDetail(course);
    }

    @Transactional
    public CourseDetailDto createCourse(UUID userId, CourseRequests.CreateCourse req) {
        CourseCategory category = getCategory(req.categoryId());
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(category.getContext()));

        String shortname = Slugs.slugify(req.shortname());
        if (shortname.isBlank()) {
            throw ApiException.badRequest("shortname không hợp lệ");
        }
        if (courseRepository.existsByShortname(shortname)) {
            throw ApiException.conflict("shortname '" + shortname + "' đã tồn tại");
        }

        Course course = new Course();
        course.setCategory(category);
        course.setTitle(req.title());
        course.setShortname(shortname);
        course.setSummary(req.summary());
        course.setCoverImageUrl(req.coverImageUrl());
        course.setPrice(req.price() != null ? req.price() : BigDecimal.ZERO);
        course.setStatus(parseStatus(req.status(), CourseStatus.DRAFT));
        course.setDescriptionHtml(req.descriptionHtml());
        course.setObjectives(objectivesToJson(req.objectives()));
        course.setPrerequisites(req.prerequisites());
        course = courseRepository.saveAndFlush(course);

        // Tạo COURSE context (con của context category).
        Context ctx = contextService.createContext(
                ContextType.COURSE, course.getId(), category.getContext());
        course.setContext(ctx);
        course = courseRepository.save(course);

        return buildDetail(course);
    }

    @Transactional
    public CourseDetailDto updateCourse(UUID userId, Long id, CourseRequests.UpdateCourse req) {
        Course course = getCourse(id);
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(course.getContext()));

        if (req.categoryId() != null) {
            course.setCategory(getCategory(req.categoryId()));
        }
        if (req.title() != null && !req.title().isBlank()) {
            course.setTitle(req.title());
        }
        if (req.summary() != null) {
            course.setSummary(req.summary());
        }
        if (req.coverImageUrl() != null) {
            course.setCoverImageUrl(req.coverImageUrl());
        }
        if (req.price() != null) {
            course.setPrice(req.price());
        }
        if (req.status() != null) {
            course.setStatus(parseStatus(req.status(), course.getStatus()));
        }
        if (req.descriptionHtml() != null) {
            course.setDescriptionHtml(req.descriptionHtml());
        }
        if (req.objectives() != null) {
            course.setObjectives(objectivesToJson(req.objectives()));
        }
        if (req.prerequisites() != null) {
            course.setPrerequisites(req.prerequisites());
        }
        return buildDetail(courseRepository.save(course));
    }

    @Transactional
    public void deleteCourse(UUID userId, Long id) {
        Course course = getCourse(id);
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(course.getContext()));
        course.setDeletedAt(java.time.Instant.now());
        courseRepository.save(course);
    }

    // ================= Sections =================

    @Transactional(readOnly = true)
    public List<SectionDto> listSections(Long courseId) {
        getCourse(courseId); // đảm bảo tồn tại
        return sectionRepository.findByCourseIdOrderBySortOrderAscIdAsc(courseId).stream()
                .map(SectionDto::from).toList();
    }

    @Transactional
    public SectionDto createSection(UUID userId, Long courseId, CourseRequests.CreateSection req) {
        Course course = getCourse(courseId);
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(course.getContext()));

        CourseSection section = new CourseSection();
        section.setCourse(course);
        section.setTitle(req.title());
        section.setSortOrder(req.sortOrder() != null ? req.sortOrder() : 0);
        section.setVideoUrl(req.videoUrl());
        section.setSubtitleUrl(req.subtitleUrl());
        section.setShortDescription(req.shortDescription());
        return SectionDto.from(sectionRepository.save(section));
    }

    @Transactional
    public SectionDto updateSection(UUID userId, Long sectionId, CourseRequests.UpdateSection req) {
        CourseSection section = getSection(sectionId);
        permissionService.requireCapability(userId, CAP_MANAGE,
                contextIdOf(section.getCourse().getContext()));

        if (req.title() != null && !req.title().isBlank()) {
            section.setTitle(req.title());
        }
        if (req.sortOrder() != null) {
            section.setSortOrder(req.sortOrder());
        }
        if (req.videoUrl() != null) {
            section.setVideoUrl(req.videoUrl().isBlank() ? null : req.videoUrl());
        }
        if (req.subtitleUrl() != null) {
            section.setSubtitleUrl(req.subtitleUrl().isBlank() ? null : req.subtitleUrl());
        }
        if (req.shortDescription() != null) {
            section.setShortDescription(req.shortDescription().isBlank() ? null : req.shortDescription());
        }
        return SectionDto.from(sectionRepository.save(section));
    }

    @Transactional
    public void deleteSection(UUID userId, Long sectionId) {
        CourseSection section = getSection(sectionId);
        permissionService.requireCapability(userId, CAP_MANAGE,
                contextIdOf(section.getCourse().getContext()));
        Instant now = Instant.now();
        List<Quiz> quizzes = quizRepository.findBySectionIdOrderBySortOrderAscIdAsc(sectionId);
        for (Quiz quiz : quizzes) {
            quiz.setDeletedAt(now);
        }
        quizRepository.saveAll(quizzes);
        section.setDeletedAt(now);
        sectionRepository.save(section);
    }

    @Transactional
    public void reorderSections(UUID userId, Long courseId, List<Long> sectionIds) {
        Course course = getCourse(courseId);
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(course.getContext()));

        List<CourseSection> sections = sectionRepository.findAllById(sectionIds);
        Map<Long, CourseSection> byId = sections.stream()
                .collect(Collectors.toMap(CourseSection::getId, Function.identity()));
        int order = 0;
        for (Long id : sectionIds) {
            CourseSection section = byId.get(id);
            if (section == null || !section.getCourse().getId().equals(courseId)) {
                throw ApiException.badRequest("Section không hợp lệ: " + id);
            }
            section.setSortOrder(order++);
        }
        sectionRepository.saveAll(sections);
    }

    // ================= Helpers =================

    private CourseDetailDto buildDetail(Course course) {
        List<SectionDto> sections =
                sectionRepository.findByCourseIdOrderBySortOrderAscIdAsc(course.getId())
                        .stream().map(SectionDto::from).toList();
        long count = enrollmentRepository.countByCourseId(course.getId());
        return CourseDetailDto.from(course, count, sections, objectivesFromJson(course.getObjectives()));
    }

    private ExamTemplate resolveTemplate(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return examTemplateRepository.findByCode(code)
                .orElseThrow(() -> ApiException.notFound(
                        "Không tìm thấy exam template '" + code + "'"));
    }

    private CourseStatus parseStatus(String raw, CourseStatus fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return CourseStatus.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Trạng thái không hợp lệ: " + raw);
        }
    }

    private Long contextIdOf(Context ctx) {
        if (ctx == null) {
            // Fallback an toàn: kiểm tra ở SYSTEM nếu dữ liệu cũ chưa có context.
            return contextService.requireSystemContext().getId();
        }
        return ctx.getId();
    }

    CourseCategory getCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục"));
    }

    Course getCourse(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khóa học"));
    }

    private CourseSection getSection(Long id) {
        return sectionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy section"));
    }
}
