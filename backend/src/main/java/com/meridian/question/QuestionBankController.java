package com.meridian.question;

import com.meridian.question.dto.ImportSummaryDto;
import com.meridian.question.dto.PassageDto;
import com.meridian.question.dto.QuestionBankRequests;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.question.dto.QuestionDetailDto;
import com.meridian.question.dto.QuestionSummaryDto;
import com.meridian.question.dto.QuestionTagDto;
import com.meridian.question.dto.QuestionUpsertRequest;
import com.meridian.rbac.PermissionService;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ngân hàng câu hỏi (Giai đoạn 3). Mọi endpoint yêu cầu capability
 * 'question:manage' tại SYSTEM context (công cụ của giáo viên/admin).
 */
@RestController
@RequestMapping("/api/admin/question-bank")
public class QuestionBankController {

    private static final String CAP = "question:manage";

    private final QuestionTaxonomyService taxonomyService;
    private final QuestionService questionService;
    private final QuestionBankExportService exportService;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    public QuestionBankController(QuestionTaxonomyService taxonomyService,
            QuestionService questionService, QuestionBankExportService exportService,
            CurrentUserProvider currentUser, PermissionService permissionService) {
        this.taxonomyService = taxonomyService;
        this.questionService = questionService;
        this.exportService = exportService;
        this.currentUser = currentUser;
        this.permissionService = permissionService;
    }

    private UUID guard() {
        UUID uid = currentUser.require().id();
        permissionService.requireSystemCapability(uid, CAP);
        return uid;
    }

    // ---- Categories ----

    @GetMapping("/categories")
    public List<QuestionCategoryDto> categories(@RequestParam(required = false) Audience audience) {
        guard();
        return taxonomyService.listCategories(audience);
    }

    @PostMapping("/categories")
    public ResponseEntity<QuestionCategoryDto> createCategory(
            @Valid @RequestBody QuestionBankRequests.CreateCategory req) {
        guard();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taxonomyService.createCategory(req));
    }

    // ---- Tags ----

    @GetMapping("/tags")
    public List<QuestionTagDto> tags() {
        guard();
        return taxonomyService.listTags();
    }

    @PostMapping("/tags")
    public ResponseEntity<QuestionTagDto> createTag(
            @Valid @RequestBody QuestionBankRequests.CreateTag req) {
        guard();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taxonomyService.createTag(req));
    }

    // ---- Passages ----

    @GetMapping("/passages")
    public List<PassageDto> passages() {
        guard();
        return taxonomyService.listPassages();
    }

    @GetMapping("/passages/{id}")
    public PassageDto passage(@PathVariable Long id) {
        guard();
        return taxonomyService.getPassage(id);
    }

    @PostMapping("/passages")
    public ResponseEntity<PassageDto> createPassage(
            @Valid @RequestBody QuestionBankRequests.UpsertPassage req) {
        guard();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taxonomyService.createPassage(req));
    }

    @PutMapping("/passages/{id}")
    public PassageDto updatePassage(@PathVariable Long id,
            @Valid @RequestBody QuestionBankRequests.UpsertPassage req) {
        guard();
        return taxonomyService.updatePassage(id, req);
    }

    @DeleteMapping("/passages/{id}")
    public ResponseEntity<Void> deletePassage(@PathVariable Long id) {
        guard();
        taxonomyService.deletePassage(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Questions ----

    @GetMapping("/questions")
    public List<QuestionSummaryDto> questions(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Audience audience) {
        guard();
        return questionService.listQuestions(categoryId, type, audience);
    }

    @GetMapping("/questions/{id}")
    public QuestionDetailDto question(@PathVariable Long id) {
        guard();
        return questionService.getQuestion(id);
    }

    @PostMapping("/questions")
    public ResponseEntity<QuestionDetailDto> createQuestion(
            @Valid @RequestBody QuestionUpsertRequest req) {
        UUID uid = guard();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(questionService.createQuestion(uid, req));
    }

    @PutMapping("/questions/{id}")
    public QuestionDetailDto updateQuestion(@PathVariable Long id,
            @Valid @RequestBody QuestionUpsertRequest req) {
        UUID uid = guard();
        return questionService.updateQuestion(uid, id, req);
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        guard();
        questionService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/questions/{id}/duplicate")
    public ResponseEntity<QuestionDetailDto> duplicateQuestion(@PathVariable Long id) {
        UUID uid = guard();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(questionService.duplicateQuestion(uid, id));
    }

    // ---- Xuất/Nhập theo danh mục ----

    @GetMapping("/categories/{id}/export")
    public ResponseEntity<byte[]> exportCategory(@PathVariable Long id) {
        guard();
        byte[] zip = exportService.exportCategory(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"question-bank-" + id + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(zip);
    }

    @PostMapping("/import")
    public ImportSummaryDto importBundle(@RequestParam("file") MultipartFile file) {
        UUID uid = guard();
        return exportService.importBundle(uid, file);
    }
}
