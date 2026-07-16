package com.meridian.homework;

import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.common.ApiException;
import com.meridian.homework.dto.HomeworkMaterialDto;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Tài liệu bài tập về nhà (Phase 21) — đọc tự do, ghi cần 'course:manage'. */
@Service
public class HomeworkMaterialService {

    private static final String CAP_MANAGE = "course:manage";
    private static final Set<String> ALLOWED_MEDIA_TYPES = Set.of("AUDIO", "VIDEO");

    private final HomeworkMaterialRepository materialRepository;
    private final CourseSectionRepository sectionRepository;
    private final ContextService contextService;
    private final PermissionService permissionService;

    public HomeworkMaterialService(HomeworkMaterialRepository materialRepository,
            CourseSectionRepository sectionRepository, ContextService contextService,
            PermissionService permissionService) {
        this.materialRepository = materialRepository;
        this.sectionRepository = sectionRepository;
        this.contextService = contextService;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public List<HomeworkMaterialDto> list(Long sectionId) {
        return materialRepository.findBySection_IdOrderBySortOrderAscIdAsc(sectionId).stream()
                .map(HomeworkMaterialService::toDto)
                .toList();
    }

    @Transactional
    public HomeworkMaterialDto create(UUID userId, Long sectionId, String mediaType, String url, String label) {
        if (mediaType == null || !ALLOWED_MEDIA_TYPES.contains(mediaType)) {
            throw ApiException.badRequest("Loại tài liệu không hợp lệ");
        }
        if (url == null || url.isBlank()) {
            throw ApiException.badRequest("Thiếu đường dẫn file");
        }
        CourseSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy section"));
        permissionService.requireCapability(userId, CAP_MANAGE, contextIdOf(section.getCourse().getContext()));

        HomeworkMaterial material = new HomeworkMaterial();
        material.setSection(section);
        material.setMediaType(mediaType);
        material.setUrl(url);
        material.setLabel(label == null || label.isBlank() ? null : label);
        material.setSortOrder(materialRepository.countBySection_Id(sectionId));
        return toDto(materialRepository.save(material));
    }

    @Transactional
    public void delete(UUID userId, Long materialId) {
        HomeworkMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy tài liệu"));
        permissionService.requireCapability(userId, CAP_MANAGE,
                contextIdOf(material.getSection().getCourse().getContext()));
        materialRepository.delete(material);
    }

    private Long contextIdOf(Context ctx) {
        if (ctx == null) {
            return contextService.requireSystemContext().getId();
        }
        return ctx.getId();
    }

    private static HomeworkMaterialDto toDto(HomeworkMaterial m) {
        return new HomeworkMaterialDto(m.getId(), m.getMediaType(), m.getUrl(), m.getLabel(), m.getSortOrder());
    }
}
