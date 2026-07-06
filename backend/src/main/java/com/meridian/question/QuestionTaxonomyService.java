package com.meridian.question;

import com.meridian.common.ApiException;
import com.meridian.question.dto.PassageDto;
import com.meridian.question.dto.QuestionBankRequests;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.question.dto.QuestionTagDto;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Danh mục, tag và passage của ngân hàng câu hỏi. */
@Service
public class QuestionTaxonomyService {

    private final QuestionCategoryRepository categoryRepository;
    private final QuestionTagRepository tagRepository;
    private final PassageRepository passageRepository;

    public QuestionTaxonomyService(QuestionCategoryRepository categoryRepository,
            QuestionTagRepository tagRepository, PassageRepository passageRepository) {
        this.categoryRepository = categoryRepository;
        this.tagRepository = tagRepository;
        this.passageRepository = passageRepository;
    }

    // ---- Categories ----

    @Transactional(readOnly = true)
    public List<QuestionCategoryDto> listCategories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(QuestionCategoryDto::from).toList();
    }

    @Transactional
    public QuestionCategoryDto createCategory(QuestionBankRequests.CreateCategory req) {
        QuestionCategory category = new QuestionCategory();
        category.setName(req.name());
        category.setDescription(req.description());
        if (req.parentId() != null) {
            category.setParent(categoryRepository.findById(req.parentId())
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục cha")));
        }
        return QuestionCategoryDto.from(categoryRepository.save(category));
    }

    QuestionCategory requireCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục câu hỏi"));
    }

    // ---- Tags ----

    @Transactional(readOnly = true)
    public List<QuestionTagDto> listTags() {
        return tagRepository.findAllByOrderByNameAsc().stream()
                .map(QuestionTagDto::from).toList();
    }

    @Transactional
    public QuestionTagDto createTag(QuestionBankRequests.CreateTag req) {
        if (tagRepository.findByName(req.name()).isPresent()) {
            throw ApiException.conflict("Tag đã tồn tại");
        }
        QuestionTag tag = new QuestionTag();
        tag.setName(req.name());
        return QuestionTagDto.from(tagRepository.save(tag));
    }

    @Transactional
    public QuestionTag getOrCreateTag(String name) {
        return tagRepository.findByName(name).orElseGet(() -> {
            QuestionTag tag = new QuestionTag();
            tag.setName(name);
            return tagRepository.save(tag);
        });
    }

    // ---- Passages ----

    @Transactional(readOnly = true)
    public List<PassageDto> listPassages() {
        return passageRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(PassageDto::from).toList();
    }

    @Transactional(readOnly = true)
    public PassageDto getPassage(Long id) {
        return PassageDto.from(requirePassage(id));
    }

    @Transactional
    public PassageDto createPassage(QuestionBankRequests.UpsertPassage req) {
        Passage p = new Passage();
        applyPassage(p, req);
        return PassageDto.from(passageRepository.save(p));
    }

    @Transactional
    public PassageDto updatePassage(Long id, QuestionBankRequests.UpsertPassage req) {
        Passage p = requirePassage(id);
        applyPassage(p, req);
        return PassageDto.from(passageRepository.save(p));
    }

    @Transactional
    public void deletePassage(Long id) {
        Passage p = requirePassage(id);
        p.setDeletedAt(Instant.now());
        passageRepository.save(p);
    }

    private void applyPassage(Passage p, QuestionBankRequests.UpsertPassage req) {
        p.setTitle(req.title());
        p.setContent(req.content());
        p.setAudioUrl(req.audioUrl());
        if (req.kind() != null && !req.kind().isBlank()) {
            try {
                p.setKind(PassageKind.valueOf(req.kind().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("kind không hợp lệ: " + req.kind());
            }
        }
    }

    Passage requirePassage(Long id) {
        return passageRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy passage"));
    }
}
