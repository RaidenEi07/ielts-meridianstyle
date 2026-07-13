package com.meridian.config;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.question.QuestionService;
import com.meridian.question.QuestionTaxonomyService;
import com.meridian.question.dto.QuestionBankRequests;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.question.dto.PassageDto;
import com.meridian.question.dto.QuestionUpsertRequest;
import com.meridian.quiz.QuizRepository;
import com.meridian.quiz.QuizService;
import com.meridian.quiz.dto.QuizRequests;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Seed một quiz Listening: passage kind=LISTENING (audio placeholder tự sinh,
 * xem frontend/public/audio) + 3 câu Note Completion (Short Answer).
 */
@Component
@Order(7)
public class ListeningDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ListeningDataInitializer.class);
    private static final String QUIZ_TITLE = "Listening Practice Test 1";

    private final QuizRepository quizRepository;
    private final QuizService quizService;
    private final QuestionTaxonomyService taxonomyService;
    private final QuestionService questionService;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final ObjectMapper json;
    private final Environment env;

    public ListeningDataInitializer(QuizRepository quizRepository, QuizService quizService,
            QuestionTaxonomyService taxonomyService, QuestionService questionService,
            CourseRepository courseRepository, CourseSectionRepository sectionRepository,
            UserRepository userRepository, ObjectMapper json, Environment env) {
        this.quizRepository = quizRepository;
        this.quizService = quizService;
        this.taxonomyService = taxonomyService;
        this.questionService = questionService;
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.userRepository = userRepository;
        this.json = json;
        this.env = env;
    }

    @Override
    public void run(String... args) {
        boolean exists = quizRepository.findAll().stream()
                .anyMatch(q -> QUIZ_TITLE.equals(q.getTitle()));
        if (exists) {
            return;
        }
        String adminEmail = env.getProperty("ADMIN_EMAIL", "admin@meridian.edu.vn");
        User admin = userRepository.findByEmailIgnoreCase(adminEmail).orElse(null);
        Course course = courseRepository.findByShortname("ielts-intensive-65").orElse(null);
        if (admin == null || course == null) {
            return;
        }
        List<CourseSection> sections =
                sectionRepository.findByCourseIdOrderBySortOrderAscIdAsc(course.getId());
        if (sections.isEmpty()) {
            return;
        }
        UUID uid = admin.getId();

        QuestionCategoryDto category = taxonomyService.createCategory(
                new QuestionBankRequests.CreateCategory(
                        "IELTS Listening - Academic", null,
                        "Câu hỏi Note Completion cho Listening", null));

        PassageDto passage = taxonomyService.createPassage(
                new QuestionBankRequests.UpsertPassage(
                        "Section 1 — University Accommodation Enquiry",
                        "LISTENING",
                        "Bản ghi mô phỏng: một sinh viên gọi điện hỏi về chỗ ở ký túc xá "
                                + "trường đại học (phí thuê, thời hạn hợp đồng, tiện ích đi kèm).",
                        "/audio/listening-demo.wav"));

        var quiz = quizService.createQuiz(uid, new QuizRequests.CreateQuiz(
                sections.get(0).getId(),
                QUIZ_TITLE,
                "Nghe đoạn hội thoại và hoàn thành các ghi chú bên dưới.",
                600, 3, false, true, 3, new BigDecimal("2"), "PUBLISHED"));

        var page = quizService.setPage(uid, quiz.quiz().id(),
                new QuizRequests.SetPage(1, "Section 1", passage.id()));

        var q1 = questionService.createQuestion(uid, new QuestionUpsertRequest(
                category.id(), "SHORT_ANSWER", "Weekly rent",
                "Ghi chú: Weekly rent: £ _____",
                null, null, null, BigDecimal.ONE,
                json.readTree("{\"acceptedAnswers\":[\"120\",\"£120\"],\"caseSensitive\":false}"),
                List.of("listening", "note-completion"), null, null, null, null, null));

        var q2 = questionService.createQuestion(uid, new QuestionUpsertRequest(
                category.id(), "SHORT_ANSWER", "Contract length",
                "Ghi chú: Minimum contract length: _____ months",
                null, null, null, BigDecimal.ONE,
                json.readTree("{\"acceptedAnswers\":[\"6\",\"six\"],\"caseSensitive\":false}"),
                List.of("listening", "note-completion"), null, null, null, null, null));

        var q3 = questionService.createQuestion(uid, new QuestionUpsertRequest(
                category.id(), "SHORT_ANSWER", "Included facility",
                "Ghi chú: Facility included free of charge: _____",
                null, null, null, BigDecimal.ONE,
                json.readTree("{\"acceptedAnswers\":[\"wifi\",\"wi-fi\"],\"caseSensitive\":false}"),
                List.of("listening", "note-completion"), null, null, null, null, null));

        quizService.importQuestions(uid, quiz.quiz().id(), new QuizRequests.ImportQuestions(
                List.of(q1.id(), q2.id(), q3.id()), page.id(), BigDecimal.ONE));

        log.info("Đã seed quiz Listening '{}' với 3 câu note completion", QUIZ_TITLE);
    }
}
