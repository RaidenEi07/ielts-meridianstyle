package com.meridian.question;

import com.meridian.common.ApiException;
import com.meridian.config.MeridianProperties;
import com.meridian.media.MediaService;
import com.meridian.question.dto.PassageDto;
import com.meridian.question.dto.QuestionBankBundle;
import com.meridian.question.dto.QuestionBankRequests;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionUpsertRequest;
import com.meridian.question.dto.ImportSummaryDto;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Xuất/nhập ngân hàng câu hỏi theo danh mục dưới dạng file .zip (manifest.json +
 * file ảnh/audio đính kèm), để chuyển nội dung giữa 2 môi trường (vd. local -> production)
 * không chia sẻ DB/ổ đĩa. Xuất KHÔNG đệ quy (chỉ đúng danh mục được chọn). Nhập bỏ qua
 * câu hỏi trùng tên trong cùng danh mục đích (an toàn khi nhập lại nhiều lần).
 */
@Service
public class QuestionBankExportService {

    private static final Pattern MEDIA_URL_PATTERN =
            Pattern.compile("https?://[^\\s\"'()]*?/uploads/(images|audio)/([^\\s\"'()]+)");

    private final QuestionRepository questionRepository;
    private final QuestionCategoryRepository categoryRepository;
    private final PassageRepository passageRepository;
    private final QuestionTagRepository tagRepository;
    private final QuestionService questionService;
    private final QuestionTaxonomyService taxonomyService;
    private final MediaService mediaService;
    private final MeridianProperties properties;
    private final ObjectMapper json;

    public QuestionBankExportService(QuestionRepository questionRepository,
            QuestionCategoryRepository categoryRepository, PassageRepository passageRepository,
            QuestionTagRepository tagRepository, QuestionService questionService,
            QuestionTaxonomyService taxonomyService, MediaService mediaService,
            MeridianProperties properties, ObjectMapper json) {
        this.questionRepository = questionRepository;
        this.categoryRepository = categoryRepository;
        this.passageRepository = passageRepository;
        this.tagRepository = tagRepository;
        this.questionService = questionService;
        this.taxonomyService = taxonomyService;
        this.mediaService = mediaService;
        this.properties = properties;
        this.json = json;
    }

    // ================= Export =================

    @Transactional(readOnly = true)
    public byte[] exportCategory(Long categoryId) {
        QuestionCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục câu hỏi"));
        List<Question> questions = questionRepository.findByCategoryIdOrderByCreatedAtDesc(categoryId);
        List<QuestionDetailDto> details = questions.stream()
                .map(q -> questionService.getQuestion(q.getId()))
                .toList();

        // Gom passage dùng chung bởi nhiều câu hỏi, gán refId theo thứ tự xuất hiện đầu tiên.
        LinkedHashMap<Long, String> passageRefIds = new LinkedHashMap<>();
        for (QuestionDetailDto d : details) {
            if (d.passageId() != null) {
                passageRefIds.putIfAbsent(d.passageId(), "p" + (passageRefIds.size() + 1));
            }
        }

        Set<String> mediaRefs = new LinkedHashSet<>();

        List<QuestionBankBundle.PassageBundle> passageBundles = new ArrayList<>();
        for (Map.Entry<Long, String> e : passageRefIds.entrySet()) {
            Passage passage = passageRepository.findById(e.getKey()).orElse(null);
            if (passage == null) {
                continue;
            }
            passageBundles.add(new QuestionBankBundle.PassageBundle(
                    e.getValue(), passage.getTitle(), passage.getKind().name(),
                    tokenize(passage.getContent(), mediaRefs),
                    tokenize(passage.getAudioUrl(), mediaRefs)));
        }

        List<QuestionBankBundle.QuestionBundle> questionBundles = new ArrayList<>();
        for (QuestionDetailDto d : details) {
            String passageRef = d.passageId() != null ? passageRefIds.get(d.passageId()) : null;
            questionBundles.add(new QuestionBankBundle.QuestionBundle(
                    d.type(), d.name(), tokenize(d.stem(), mediaRefs), passageRef,
                    d.answerParagraphIndex(), tokenize(d.explanation(), mediaRefs), d.defaultMark(),
                    tokenizeSettings(d.settings(), mediaRefs), d.tags(),
                    d.options(), d.matchingPairs(), d.dragItems(), d.dragZones(),
                    d.clozeSubAnswers()));
        }

        QuestionBankBundle.Manifest manifest = new QuestionBankBundle.Manifest(
                QuestionBankBundle.FORMAT_VERSION,
                new QuestionBankBundle.CategoryBundle(category.getName(), category.getDescription()),
                passageBundles, questionBundles);

        return buildZip(manifest, mediaRefs);
    }

    private byte[] buildZip(QuestionBankBundle.Manifest manifest, Set<String> mediaRefs) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(baos)) {
            zip.putNextEntry(new ZipEntry("manifest.json"));
            zip.write(json.writeValueAsString(manifest).getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();

            for (String ref : mediaRefs) {
                Path file = Path.of(properties.getUploads().getDir()).resolve(ref);
                if (!Files.isRegularFile(file)) {
                    // File tham chiếu nhưng không còn trên đĩa — bỏ qua, không làm hỏng cả lần xuất.
                    continue;
                }
                zip.putNextEntry(new ZipEntry("media/" + ref));
                zip.write(Files.readAllBytes(file));
                zip.closeEntry();
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Xuất câu hỏi thất bại");
        }
        return baos.toByteArray();
    }

    // ================= Import =================

    @Transactional
    public ImportSummaryDto importBundle(UUID userId, MultipartFile zip) {
        Map<String, byte[]> mediaFiles = new LinkedHashMap<>();
        byte[] manifestBytes = null;
        try (ZipInputStream zin = new ZipInputStream(zip.getInputStream())) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                byte[] bytes = zin.readAllBytes();
                if ("manifest.json".equals(entry.getName())) {
                    manifestBytes = bytes;
                } else if (entry.getName().startsWith("media/")) {
                    mediaFiles.put(entry.getName().substring("media/".length()), bytes);
                }
            }
        } catch (IOException e) {
            throw ApiException.badRequest("Không đọc được file .zip");
        }
        if (manifestBytes == null) {
            throw ApiException.badRequest("File .zip thiếu manifest.json");
        }

        QuestionBankBundle.Manifest manifest;
        try {
            manifest = json.readValue(manifestBytes, QuestionBankBundle.Manifest.class);
        } catch (Exception e) {
            throw ApiException.badRequest("manifest.json không hợp lệ");
        }
        if (manifest.formatVersion() != QuestionBankBundle.FORMAT_VERSION) {
            throw ApiException.badRequest(
                    "Phiên bản gói không được hỗ trợ: " + manifest.formatVersion());
        }

        List<String> warnings = new ArrayList<>();

        // ---- Danh mục: tái dùng theo tên, không thì tạo mới ----
        Optional<QuestionCategory> existingCategory =
                categoryRepository.findByNameIgnoreCase(manifest.category().name());
        boolean categoryReused = existingCategory.isPresent();
        QuestionCategory category;
        if (existingCategory.isPresent()) {
            category = existingCategory.get();
        } else {
            QuestionCategoryDto created = taxonomyService.createCategory(
                    new QuestionBankRequests.CreateCategory(
                            manifest.category().name(), null, manifest.category().description(), null));
            category = categoryRepository.findById(created.id()).orElseThrow();
        }

        // ---- Media: ghi file lên đĩa server đích, dựng map token -> URL mới ----
        Map<String, String> tokenToUrl = new LinkedHashMap<>();
        for (Map.Entry<String, byte[]> e : mediaFiles.entrySet()) {
            String relPath = e.getKey(); // vd. "images/<uuid>.jpg"
            int slash = relPath.indexOf('/');
            if (slash < 0) {
                continue;
            }
            String subDir = relPath.substring(0, slash);
            String filename = relPath.substring(slash + 1);
            int dot = filename.lastIndexOf('.');
            String extension = dot >= 0 ? filename.substring(dot) : "";
            String newUrl = mediaService.storeRawBytes(e.getValue(), subDir, extension);
            tokenToUrl.put("{{MEDIA:" + relPath + "}}", newUrl);
        }

        // ---- Passage: tái dùng theo tiêu đề (heuristic — trùng tên ở 2 môi trường sẽ bị
        // gộp nhầm, chấp nhận theo quyết định đã chốt), không thì tạo mới ----
        Map<String, Long> passageIdByRef = new LinkedHashMap<>();
        int passagesCreated = 0;
        int passagesReused = 0;
        for (QuestionBankBundle.PassageBundle pb : manifest.passages()) {
            Optional<Passage> existingPassage = passageRepository.findByTitleIgnoreCase(pb.title());
            if (existingPassage.isPresent()) {
                passageIdByRef.put(pb.refId(), existingPassage.get().getId());
                passagesReused++;
                continue;
            }
            PassageDto createdPassage = taxonomyService.createPassage(
                    new QuestionBankRequests.UpsertPassage(pb.title(), pb.kind(),
                            detokenize(pb.content(), tokenToUrl),
                            detokenize(pb.audioUrl(), tokenToUrl)));
            passageIdByRef.put(pb.refId(), createdPassage.id());
            passagesCreated++;
        }

        // ---- Câu hỏi: bỏ qua trùng tên trong đúng danh mục đích ----
        int questionsCreated = 0;
        int questionsSkipped = 0;
        int tagsCreated = 0;
        int tagsReused = 0;
        for (QuestionBankBundle.QuestionBundle qb : manifest.questions()) {
            if (questionRepository.findByCategoryIdAndNameIgnoreCase(category.getId(), qb.name())
                    .isPresent()) {
                questionsSkipped++;
                continue;
            }
            for (String tagName : nz(qb.tags())) {
                if (tagRepository.findByName(tagName).isPresent()) {
                    tagsReused++;
                } else {
                    tagsCreated++;
                }
            }
            Long passageId = qb.passageRef() != null ? passageIdByRef.get(qb.passageRef()) : null;
            QuestionUpsertRequest req = new QuestionUpsertRequest(
                    category.getId(), qb.type(), qb.name(), detokenize(qb.stem(), tokenToUrl),
                    passageId, qb.answerParagraphIndex(), detokenize(qb.explanation(), tokenToUrl),
                    qb.defaultMark(), detokenizeSettings(qb.settings(), tokenToUrl), qb.tags(),
                    qb.options(), qb.matchingPairs(), qb.dragItems(), qb.dragZones(),
                    qb.clozeSubAnswers());
            try {
                questionService.createQuestion(userId, req);
                questionsCreated++;
            } catch (ApiException e) {
                warnings.add("Bỏ qua câu hỏi \"" + qb.name() + "\": " + e.getMessage());
            }
        }

        return new ImportSummaryDto(
                categoryReused ? 0 : 1, categoryReused ? 1 : 0,
                passagesCreated, passagesReused, tagsCreated, tagsReused,
                questionsCreated, questionsSkipped, warnings);
    }

    // ================= Media token helpers =================

    private String tokenize(String text, Set<String> mediaRefs) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        Matcher m = MEDIA_URL_PATTERN.matcher(text);
        StringBuilder sb = new StringBuilder();
        int last = 0;
        boolean found = false;
        while (m.find()) {
            found = true;
            String ref = m.group(1) + "/" + m.group(2);
            mediaRefs.add(ref);
            sb.append(text, last, m.start()).append("{{MEDIA:").append(ref).append("}}");
            last = m.end();
        }
        if (!found) {
            return text;
        }
        sb.append(text, last, text.length());
        return sb.toString();
    }

    private JsonNode tokenizeSettings(JsonNode settings, Set<String> mediaRefs) {
        if (settings == null || settings.isNull()) {
            return settings;
        }
        String raw = json.writeValueAsString(settings);
        String tokenized = tokenize(raw, mediaRefs);
        return tokenized.equals(raw) ? settings : json.readTree(tokenized);
    }

    private String detokenize(String text, Map<String, String> tokenToUrl) {
        if (text == null || text.isEmpty() || tokenToUrl.isEmpty()) {
            return text;
        }
        String result = text;
        for (Map.Entry<String, String> e : tokenToUrl.entrySet()) {
            if (result.contains(e.getKey())) {
                result = result.replace(e.getKey(), e.getValue());
            }
        }
        return result;
    }

    private JsonNode detokenizeSettings(JsonNode settings, Map<String, String> tokenToUrl) {
        if (settings == null || settings.isNull() || tokenToUrl.isEmpty()) {
            return settings;
        }
        String raw = json.writeValueAsString(settings);
        String detok = detokenize(raw, tokenToUrl);
        return detok.equals(raw) ? settings : json.readTree(detok);
    }

    private static List<String> nz(List<String> list) {
        return list == null ? List.of() : list;
    }
}
