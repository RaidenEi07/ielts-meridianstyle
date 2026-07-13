package com.meridian.config;

import com.meridian.question.PassageKind;
import com.meridian.question.QuestionRepository;
import com.meridian.question.QuestionService;
import com.meridian.question.QuestionTaxonomyService;
import com.meridian.question.dto.PassageDto;
import com.meridian.question.dto.QuestionBankRequests;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.question.dto.QuestionParts;
import com.meridian.question.dto.QuestionUpsertRequest;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Seed ngân hàng câu hỏi: 1 danh mục, 1 passage, mỗi loại 1 câu hỏi mẫu. */
@Component
@Order(3)
public class QuestionBankDataInitializer implements CommandLineRunner {

    private static final Logger log =
            LoggerFactory.getLogger(QuestionBankDataInitializer.class);

    private final QuestionRepository questionRepository;
    private final QuestionTaxonomyService taxonomy;
    private final QuestionService questions;
    private final UserRepository userRepository;
    private final ObjectMapper json;
    private final Environment env;

    public QuestionBankDataInitializer(QuestionRepository questionRepository,
            QuestionTaxonomyService taxonomy, QuestionService questions,
            UserRepository userRepository, ObjectMapper json, Environment env) {
        this.questionRepository = questionRepository;
        this.taxonomy = taxonomy;
        this.questions = questions;
        this.userRepository = userRepository;
        this.json = json;
        this.env = env;
    }

    @Override
    public void run(String... args) {
        if (questionRepository.count() > 0) {
            return;
        }
        String adminEmail = env.getProperty("ADMIN_EMAIL", "admin@meridian.edu.vn");
        User admin = userRepository.findByEmailIgnoreCase(adminEmail).orElse(null);
        if (admin == null) {
            return;
        }
        UUID uid = admin.getId();

        QuestionCategoryDto cat = taxonomy.createCategory(
                new QuestionBankRequests.CreateCategory(
                        "IELTS Reading - Academic", null, "Câu hỏi mẫu cho Reading", null));
        PassageDto passage = taxonomy.createPassage(
                new QuestionBankRequests.UpsertPassage(
                        "The History of Tea",
                        PassageKind.READING.name(),
                        "Tea is one of the most widely consumed beverages in the world...",
                        null));

        // 1. Multiple Choice
        questions.createQuestion(uid, q(cat.id(), passage.id(), "MULTIPLE_CHOICE",
                "Tea origin (MCQ)", "Where did tea originate?",
                null, List.of("tea", "reading"),
                List.of(
                        opt("China", true), opt("Brazil", false),
                        opt("Egypt", false), opt("Canada", false)),
                null, null, null, null));

        // 2. True/False/Not Given
        questions.createQuestion(uid, q(cat.id(), passage.id(), "TRUE_FALSE_NOT_GIVEN",
                "Tea is popular (TFNG)", "Tea is widely consumed worldwide.",
                null, List.of("tfng"),
                List.of(opt("True", true), opt("False", false), opt("Not Given", false)),
                null, null, null, null));

        // 3. Matching
        questions.createQuestion(uid, q(cat.id(), passage.id(), "MATCHING",
                "Match country to drink", "Nối quốc gia với đồ uống.",
                null, List.of("matching"), null,
                List.of(
                        pair("Japan", "Green tea"),
                        pair("England", "Black tea"),
                        pair("Argentina", "Mate")),
                null, null, null));

        // 4. Short Answer
        questions.createQuestion(uid, q(cat.id(), passage.id(), "SHORT_ANSWER",
                "Main ingredient", "What is the main ingredient of tea (1 word)?",
                readJson("{\"acceptedAnswers\":[\"water\",\"leaves\"],\"caseSensitive\":false}"),
                List.of("short-answer"), null, null, null, null, null));

        // 5. Essay
        questions.createQuestion(uid, q(cat.id(), null, "ESSAY",
                "Writing Task 2", "Some people think tea is healthier than coffee. Discuss.",
                readJson("{\"wordLimit\":250,\"rubric\":[\"Task Achievement\",\"Coherence & Cohesion\",\"Lexical Resource\",\"Grammatical Range\"]}"),
                List.of("writing", "essay"), null, null, null, null, null));

        // 6. Drag & drop into text
        questions.createQuestion(uid, qDrag(cat.id(), "DRAG_DROP_TEXT",
                "Complete the sentence",
                readJson("{\"template\":\"The [[1]] orbits the [[2]].\"}"),
                List.of(dragItem("Earth", "1"), dragItem("Sun", "2")),
                null));

        // 7. Drag & drop markers
        questions.createQuestion(uid, qDrag(cat.id(), "DRAG_DROP_MARKER",
                "Label the map",
                readJson("{\"backgroundImageUrl\":\"/img/campus-map.png\"}"),
                List.of(dragItem("Library", "A"), dragItem("Cafeteria", "B")),
                List.of(zone("A", 40, 60, 80, 40), zone("B", 200, 120, 80, 40))));

        // 8. Cloze (Embedded Answers)
        questions.createQuestion(uid, new QuestionUpsertRequest(
                cat.id(), "CLOZE", "Capital cloze",
                "The capital of France is {1} and {2}.", null,
                null, null, BigDecimal.ONE, null, List.of("cloze"),
                null, null, null, null,
                List.of(
                        new QuestionParts.ClozeSubAnswer(null, 1, "TEXT",
                                readJson("[\"Paris\"]"), null, 0),
                        new QuestionParts.ClozeSubAnswer(null, 2, "SELECT",
                                readJson("[\"a city\"]"),
                                readJson("[\"a city\",\"a river\"]"), 1))));

        log.info("Đã seed {} câu hỏi mẫu (8 loại)", questionRepository.count());
    }

    // ---- helpers ----

    private QuestionUpsertRequest q(Long catId, Long passageId, String type, String name,
            String stem, JsonNode settings, List<String> tags,
            List<QuestionParts.Option> options, List<QuestionParts.MatchingPair> pairs,
            List<QuestionParts.DragItem> items, List<QuestionParts.DragZone> zones,
            List<QuestionParts.ClozeSubAnswer> cloze) {
        return new QuestionUpsertRequest(catId, type, name, stem, passageId, null, null,
                BigDecimal.ONE, settings, tags, options, pairs, items, zones, cloze);
    }

    private QuestionUpsertRequest qDrag(Long catId, String type, String name,
            JsonNode settings, List<QuestionParts.DragItem> items,
            List<QuestionParts.DragZone> zones) {
        return new QuestionUpsertRequest(catId, type, name, null, null, null, null,
                BigDecimal.ONE, settings, List.of("drag-drop"), null, null, items, zones, null);
    }

    private QuestionParts.Option opt(String content, boolean correct) {
        return new QuestionParts.Option(null, content, correct, null, 0);
    }

    private QuestionParts.MatchingPair pair(String left, String right) {
        return new QuestionParts.MatchingPair(null, left, right, 0);
    }

    private QuestionParts.DragItem dragItem(String content, String target) {
        return new QuestionParts.DragItem(null, content, target, 0);
    }

    private QuestionParts.DragZone zone(String label, int x, int y, int w, int h) {
        return new QuestionParts.DragZone(null, label, x, y, w, h, 0);
    }

    private JsonNode readJson(String raw) {
        return json.readTree(raw);
    }
}
