package com.meridian.vocab;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.vocab.VocabCard.CardType;
import com.meridian.vocab.dto.VocabDtos.CardInput;
import com.meridian.vocab.dto.VocabDtos.VocabCardDto;
import com.meridian.vocab.dto.VocabDtos.VocabSetDetailDto;
import com.meridian.vocab.dto.VocabDtos.VocabSetSummaryDto;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quản lý bộ thẻ luyện từ vựng/phát âm (vocab_sets/vocab_cards) — soạn thảo
 * (thủ công hoặc import hàng loạt) dùng chung 1 capability với quản lý khóa
 * học/ngân hàng câu hỏi, xem thì cần đã ghi danh khóa chứa section đó.
 */
@Service
public class VocabService {

    private static final String CAP = "course:manage";

    private final VocabSetRepository setRepository;
    private final VocabCardRepository cardRepository;
    private final CourseSectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PermissionService permissionService;
    private final ContextService contextService;

    public VocabService(VocabSetRepository setRepository, VocabCardRepository cardRepository,
            CourseSectionRepository sectionRepository, EnrollmentRepository enrollmentRepository,
            PermissionService permissionService, ContextService contextService) {
        this.setRepository = setRepository;
        this.cardRepository = cardRepository;
        this.sectionRepository = sectionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.permissionService = permissionService;
        this.contextService = contextService;
    }

    @Transactional
    public VocabSetDetailDto createSet(UUID uid, Long sectionId, String title, List<CardInput> cards) {
        CourseSection section = requireSection(sectionId);
        permissionService.requireCapability(uid, CAP, contextIdOf(section.getCourse().getContext()));
        if (title == null || title.isBlank()) {
            throw ApiException.badRequest("Thiếu tên bộ thẻ");
        }
        if (cards == null || cards.isEmpty()) {
            throw ApiException.badRequest("Bộ thẻ cần ít nhất 1 thẻ");
        }

        VocabSet set = new VocabSet();
        set.setSection(section);
        set.setTitle(title.trim());
        int nextSort = setRepository.findBySection_IdOrderBySortOrderAscIdAsc(sectionId).size();
        set.setSortOrder(nextSort);
        set = setRepository.save(set);

        int i = 0;
        for (CardInput c : cards) {
            if (c.text() == null || c.text().isBlank()) continue;
            if (c.audioUrl() == null || c.audioUrl().isBlank()) {
                throw ApiException.badRequest("Thẻ \"" + c.text() + "\" thiếu audio mẫu");
            }
            VocabCard card = new VocabCard();
            card.setSet(set);
            card.setCardType("SENTENCE".equalsIgnoreCase(c.cardType()) ? CardType.SENTENCE : CardType.WORD);
            card.setText(c.text().trim());
            card.setAcceptedAnswer(c.acceptedAnswer());
            card.setAudioUrl(c.audioUrl());
            card.setSortOrder(i++);
            cardRepository.save(card);
        }
        return getSetDetailForAdmin(uid, set.getId());
    }

    @Transactional(readOnly = true)
    public List<VocabSetSummaryDto> listSetsForSection(UUID userId, Long sectionId) {
        CourseSection section = requireSection(sectionId);
        requireEnrolled(userId, section.getCourse());
        return summarize(sectionId);
    }

    @Transactional(readOnly = true)
    public List<VocabSetSummaryDto> listSetsForSectionAdmin(UUID uid, Long sectionId) {
        CourseSection section = requireSection(sectionId);
        permissionService.requireCapability(uid, CAP, contextIdOf(section.getCourse().getContext()));
        return summarize(sectionId);
    }

    private List<VocabSetSummaryDto> summarize(Long sectionId) {
        return setRepository.findBySection_IdOrderBySortOrderAscIdAsc(sectionId).stream()
                .map(s -> new VocabSetSummaryDto(s.getId(), s.getTitle(), s.getSortOrder(),
                        cardRepository.countBySet_Id(s.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public VocabSetDetailDto getSetDetail(UUID userId, Long setId) {
        VocabSet set = requireSet(setId);
        requireEnrolled(userId, set.getSection().getCourse());
        return toDetail(set);
    }

    @Transactional(readOnly = true)
    public VocabSetDetailDto getSetDetailForAdmin(UUID uid, Long setId) {
        VocabSet set = requireSet(setId);
        permissionService.requireCapability(uid, CAP, contextIdOf(set.getSection().getCourse().getContext()));
        return toDetail(set);
    }

    @Transactional
    public void deleteSet(UUID uid, Long setId) {
        VocabSet set = requireSet(setId);
        permissionService.requireCapability(uid, CAP, contextIdOf(set.getSection().getCourse().getContext()));
        setRepository.delete(set);
    }

    private VocabSetDetailDto toDetail(VocabSet set) {
        List<VocabCardDto> cards = cardRepository.findBySet_IdOrderBySortOrderAscIdAsc(set.getId()).stream()
                .map(c -> new VocabCardDto(c.getId(), c.getCardType().name(), c.getText(), c.getAudioUrl(),
                        c.getSortOrder()))
                .toList();
        return new VocabSetDetailDto(set.getId(), set.getTitle(), cards);
    }

    VocabCard requireCard(Long cardId) {
        return cardRepository.findById(cardId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thẻ từ vựng"));
    }

    private VocabSet requireSet(Long id) {
        return setRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bộ thẻ"));
    }

    private CourseSection requireSection(Long id) {
        return sectionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy section"));
    }

    private void requireEnrolled(UUID userId, Course course) {
        if (!enrollmentRepository.existsByUserIdAndCourseId(userId, course.getId())) {
            throw ApiException.forbidden("Bạn cần được ghi danh khóa học này trước");
        }
    }

    Long contextIdOf(Context ctx) {
        return ctx == null ? contextService.requireSystemContext().getId() : ctx.getId();
    }
}
