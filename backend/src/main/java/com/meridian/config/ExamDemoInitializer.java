package com.meridian.config;

import com.meridian.question.Passage;
import com.meridian.question.PassageRepository;
import com.meridian.question.Question;
import com.meridian.question.QuestionRepository;
import com.meridian.question.QuestionType;
import com.meridian.quiz.Quiz;
import com.meridian.quiz.QuizPage;
import com.meridian.quiz.QuizPageRepository;
import com.meridian.quiz.QuizQuestion;
import com.meridian.quiz.QuizQuestionRepository;
import com.meridian.quiz.QuizRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Dựng dữ liệu demo cho giao diện thi IELTS: gán passage Reading vào một page
 * và gắn các câu khách quan vào page đó (để render split-pane). Essay để riêng.
 */
@Component
@Order(6)
public class ExamDemoInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ExamDemoInitializer.class);

    private static final String READING_PASSAGE = """
            The History of Tea

            Tea is one of the most widely consumed beverages in the world, second \
            only to water. Its origins can be traced back nearly five thousand years \
            to ancient China, where, according to legend, the Emperor Shen Nung \
            discovered the drink by accident when leaves from a wild tree blew into \
            his pot of boiling water. Intrigued by the pleasant aroma, he decided to \
            taste the infusion, and tea was born.

            For centuries, tea remained a distinctly Chinese product, valued both as \
            a medicine and as a refreshing drink. It was during the Tang dynasty \
            (618-907 AD) that tea drinking became a refined art, complete with \
            specialised utensils and elaborate ceremonies. Buddhist monks, who used \
            tea to stay awake during long hours of meditation, played a key role in \
            spreading its popularity across Asia, first to Japan and Korea.

            European traders encountered tea in the sixteenth century, and by the \
            1600s it had become a fashionable luxury among the aristocracy of \
            England and the Netherlands. Heavy taxation and the high cost of \
            importation initially kept it out of reach of ordinary people. Over time, \
            however, prices fell, and tea became the everyday drink of millions, \
            shaping social customs and even influencing world events such as the \
            Boston Tea Party of 1773.
            """;

    private final QuizRepository quizRepository;
    private final QuizPageRepository pageRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuestionRepository questionRepository;
    private final PassageRepository passageRepository;

    public ExamDemoInitializer(QuizRepository quizRepository, QuizPageRepository pageRepository,
            QuizQuestionRepository quizQuestionRepository, QuestionRepository questionRepository,
            PassageRepository passageRepository) {
        this.quizRepository = quizRepository;
        this.pageRepository = pageRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.questionRepository = questionRepository;
        this.passageRepository = passageRepository;
    }

    @Override
    public void run(String... args) {
        Quiz quiz = quizRepository.findAll().stream()
                .filter(q -> "Reading Practice Test 1".equals(q.getTitle()))
                .findFirst().orElse(null);
        if (quiz == null) {
            return;
        }
        if (!pageRepository.findByQuizIdOrderByPageNumberAsc(quiz.getId()).isEmpty()) {
            return; // đã dựng
        }

        var quizQuestions = quizQuestionRepository.findByQuizIdOrderBySortOrderAscIdAsc(quiz.getId());

        // Tìm passage từ câu khách quan đầu tiên có gắn passage.
        Long passageId = null;
        for (QuizQuestion qq : quizQuestions) {
            Question q = questionRepository.findById(qq.getQuestionId()).orElse(null);
            if (q != null && q.getType() != QuestionType.ESSAY && q.getPassage() != null) {
                passageId = q.getPassage().getId();
                break;
            }
        }
        if (passageId == null) {
            return;
        }

        // Làm giàu nội dung passage để demo split-pane.
        Passage passage = passageRepository.findById(passageId).orElse(null);
        if (passage != null) {
            passage.setContent(READING_PASSAGE);
            passageRepository.save(passage);
        }

        // Tạo page Reading và gắn các câu khách quan vào.
        QuizPage page = new QuizPage();
        page.setQuizId(quiz.getId());
        page.setPageNumber(1);
        page.setPartLabel("Part 1 — Reading Passage");
        page.setPassageId(passageId);
        page = pageRepository.save(page);

        for (QuizQuestion qq : quizQuestions) {
            Question q = questionRepository.findById(qq.getQuestionId()).orElse(null);
            if (q != null && q.getType() != QuestionType.ESSAY) {
                qq.setPageId(page.getId());
                quizQuestionRepository.save(qq);
            }
        }
        log.info("Đã dựng trang Reading cho quiz '{}' (passage {})", quiz.getTitle(), passageId);
    }
}
