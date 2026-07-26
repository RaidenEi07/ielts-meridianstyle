package com.meridian.question;

import com.meridian.common.ApiException;
import com.meridian.question.dto.PassageDto;
import com.meridian.question.dto.QuestionBankRequests;
import com.meridian.question.dto.QuestionCategoryDto;
import com.meridian.question.dto.QuestionTagDto;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
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

    @Transactional(readOnly = true)
    public List<QuestionCategoryDto> listCategories(Audience audience) {
        if (audience == null) {
            return listCategories();
        }
        return categoryRepository.findAllByAudienceOrderByNameAsc(audience).stream()
                .map(QuestionCategoryDto::from).toList();
    }

    @Transactional
    public QuestionCategoryDto createCategory(QuestionBankRequests.CreateCategory req) {
        if (findByNameAndParent(req.name(), req.parentId()).isPresent()) {
            throw ApiException.conflict("Danh mục cùng tên đã tồn tại trong danh mục cha này");
        }
        QuestionCategory category = new QuestionCategory();
        category.setName(req.name());
        category.setDescription(req.description());
        category.setAudience(req.audience() != null ? req.audience() : Audience.IELTS);
        if (req.parentId() != null) {
            category.setParent(categoryRepository.findById(req.parentId())
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục cha")));
        }
        return QuestionCategoryDto.from(categoryRepository.save(category));
    }

    /** Đổi tên và/hoặc chuyển danh mục sang cha khác — chặn đổi thành cha của chính mình/con cháu mình. */
    @Transactional
    public QuestionCategoryDto updateCategory(Long id, QuestionBankRequests.UpdateCategory req) {
        QuestionCategory category = requireCategory(id);
        Optional<QuestionCategory> dup = findByNameAndParent(req.name(), req.parentId());
        if (dup.isPresent() && !dup.get().getId().equals(id)) {
            throw ApiException.conflict("Danh mục cùng tên đã tồn tại trong danh mục cha này");
        }
        QuestionCategory newParent = null;
        if (req.parentId() != null) {
            if (req.parentId().equals(id)) {
                throw ApiException.badRequest("Danh mục không thể là cha của chính nó");
            }
            newParent = categoryRepository.findById(req.parentId())
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục cha"));
            for (QuestionCategory ancestor = newParent; ancestor != null; ancestor = ancestor.getParent()) {
                if (ancestor.getId().equals(id)) {
                    throw ApiException.badRequest("Không thể chuyển danh mục vào chính con cháu của nó");
                }
            }
        }
        category.setName(req.name());
        category.setDescription(req.description());
        if (req.audience() != null) {
            category.setAudience(req.audience());
        }
        category.setParent(newParent);
        return QuestionCategoryDto.from(categoryRepository.save(category));
    }

    private Optional<QuestionCategory> findByNameAndParent(String name, Long parentId) {
        return parentId != null
                ? categoryRepository.findByNameIgnoreCaseAndParent_Id(name, parentId)
                : categoryRepository.findByNameIgnoreCaseAndParentIsNull(name);
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
