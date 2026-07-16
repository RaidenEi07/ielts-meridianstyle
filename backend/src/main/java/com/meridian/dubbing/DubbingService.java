package com.meridian.dubbing;

import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.common.ApiException;
import com.meridian.dubbing.dto.DubbingDtos.CharacterDto;
import com.meridian.dubbing.dto.DubbingDtos.SegmentDto;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Nhân vật + đoạn thoại trong video (Phase 16) — đọc tự do, ghi cần 'course:manage'. */
@Service
public class DubbingService {

    private static final String CAP_MANAGE = "course:manage";

    private final DubbingCharacterRepository characterRepository;
    private final DubbingCharacterSegmentRepository segmentRepository;
    private final CourseSectionRepository sectionRepository;
    private final ContextService contextService;
    private final PermissionService permissionService;

    public DubbingService(DubbingCharacterRepository characterRepository,
            DubbingCharacterSegmentRepository segmentRepository,
            CourseSectionRepository sectionRepository, ContextService contextService,
            PermissionService permissionService) {
        this.characterRepository = characterRepository;
        this.segmentRepository = segmentRepository;
        this.sectionRepository = sectionRepository;
        this.contextService = contextService;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public List<CharacterDto> listCharacters(Long sectionId) {
        List<DubbingCharacter> characters = characterRepository
                .findBySection_IdOrderBySortOrderAscIdAsc(sectionId);
        if (characters.isEmpty()) {
            return List.of();
        }
        List<Long> characterIds = characters.stream().map(DubbingCharacter::getId).toList();
        Map<Long, List<SegmentDto>> segmentsByCharacter = segmentRepository
                .findByCharacter_IdInOrderBySortOrderAscIdAsc(characterIds).stream()
                .collect(Collectors.groupingBy(s -> s.getCharacter().getId(),
                        Collectors.mapping(DubbingService::toSegmentDto, Collectors.toList())));
        return characters.stream()
                .map(c -> new CharacterDto(c.getId(), c.getName(),
                        segmentsByCharacter.getOrDefault(c.getId(), List.of())))
                .toList();
    }

    @Transactional
    public CharacterDto createCharacter(UUID userId, Long sectionId, String name) {
        if (name == null || name.isBlank()) {
            throw ApiException.badRequest("Thiếu tên nhân vật");
        }
        CourseSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy section"));
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(section.getCourse().getContext()));

        DubbingCharacter character = new DubbingCharacter();
        character.setSection(section);
        character.setName(name);
        character.setSortOrder(characterRepository.countBySection_Id(sectionId));
        character = characterRepository.save(character);
        return new CharacterDto(character.getId(), character.getName(), List.of());
    }

    @Transactional
    public void deleteCharacter(UUID userId, Long characterId) {
        DubbingCharacter character = getCharacter(characterId);
        permissionService.requireCapability(userId, CAP_MANAGE,
                contextIdOf(character.getSection().getCourse().getContext()));
        characterRepository.delete(character);
    }

    @Transactional
    public SegmentDto addSegment(UUID userId, Long characterId, BigDecimal start, BigDecimal end) {
        if (start == null || end == null || end.compareTo(start) <= 0) {
            throw ApiException.badRequest("Thời gian kết thúc phải lớn hơn thời gian bắt đầu");
        }
        DubbingCharacter character = getCharacter(characterId);
        permissionService.requireCapability(userId, CAP_MANAGE,
                contextIdOf(character.getSection().getCourse().getContext()));

        DubbingCharacterSegment segment = new DubbingCharacterSegment();
        segment.setCharacter(character);
        segment.setStartSeconds(start);
        segment.setEndSeconds(end);
        segment.setSortOrder(segmentRepository.countByCharacter_Id(characterId));
        segment = segmentRepository.save(segment);
        return toSegmentDto(segment);
    }

    @Transactional
    public void deleteSegment(UUID userId, Long segmentId) {
        DubbingCharacterSegment segment = segmentRepository.findById(segmentId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đoạn thoại"));
        permissionService.requireCapability(userId, CAP_MANAGE,
                contextIdOf(segment.getCharacter().getSection().getCourse().getContext()));
        segmentRepository.delete(segment);
    }

    private DubbingCharacter getCharacter(Long characterId) {
        return characterRepository.findById(characterId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy nhân vật"));
    }

    private Long contextIdOf(Context ctx) {
        if (ctx == null) {
            return contextService.requireSystemContext().getId();
        }
        return ctx.getId();
    }

    private static SegmentDto toSegmentDto(DubbingCharacterSegment s) {
        return new SegmentDto(s.getId(), s.getStartSeconds(), s.getEndSeconds());
    }
}
