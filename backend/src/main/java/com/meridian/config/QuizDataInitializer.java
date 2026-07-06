package com.meridian.config;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.question.QuestionRepository;
import com.meridian.question.QuestionType;
import com.meridian.quiz.QuizRepository;
import com.meridian.quiz.QuizService;
import com.meridian.quiz.dto.QuizDtos.QuizDetailDto;
import com.meridian.quiz.dto.QuizRequests;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Seed một quiz IELTS đã xuất bản với 3 câu khách quan để demo luồng làm bài. */
@Component
@Order(4)
public class QuizDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(QuizDataInitializer.class);

    private final QuizRepository quizRepository;
    private final QuizService quizService;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final Environment env;

    public QuizDataInitializer(QuizRepository quizRepository, QuizService quizService,
            CourseRepository courseRepository, CourseSectionRepository sectionRepository,
            QuestionRepository questionRepository, UserRepository userRepository,
            Environment env) {
        this.quizRepository = quizRepository;
        this.quizService = quizService;
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.env = env;
    }

    @Override
    public void run(String... args) {
        if (quizRepository.count() > 0) {
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

        QuizDetailDto quiz = quizService.createQuiz(uid, new QuizRequests.CreateQuiz(
                sections.get(0).getId(),
                "Reading Practice Test 1",
                "Bài luyện Reading — 3 câu mẫu, có giới hạn thời gian và chống gian lận.",
                600,            // 10 phút
                3,              // tối đa 3 lượt
                false,          // không trộn
                true,           // bật anti-cheat
                3,              // tối đa 3 lần vi phạm
                new BigDecimal("2"),  // điểm đạt
                "PUBLISHED"));

        List<Long> questionIds = new ArrayList<>();
        for (QuestionType t : List.of(QuestionType.MULTIPLE_CHOICE,
                QuestionType.TRUE_FALSE_NOT_GIVEN, QuestionType.SHORT_ANSWER)) {
            questionRepository.findByTypeOrderByCreatedAtDesc(t).stream()
                    .findFirst().ifPresent(q -> questionIds.add(q.getId()));
        }
        if (!questionIds.isEmpty()) {
            quizService.importQuestions(uid, quiz.quiz().id(),
                    new QuizRequests.ImportQuestions(questionIds, null, BigDecimal.ONE));
        }

        log.info("Đã seed quiz '{}' với {} câu hỏi", quiz.quiz().title(), questionIds.size());
    }
}
