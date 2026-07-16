package com.meridian.homework;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HomeworkMaterialServiceTest {

    @Mock private HomeworkMaterialRepository materialRepository;
    @Mock private CourseSectionRepository sectionRepository;
    @Mock private ContextService contextService;
    @Mock private PermissionService permissionService;

    private HomeworkMaterialService service;

    @BeforeEach
    void setUp() {
        service = new HomeworkMaterialService(materialRepository, sectionRepository, contextService,
                permissionService);
    }

    private CourseSection sectionWithContext(Long sectionId, Long contextId) {
        Context context = new Context();
        context.setId(contextId);
        Course course = new Course();
        course.setContext(context);
        CourseSection section = new CourseSection();
        section.setId(sectionId);
        section.setCourse(course);
        return section;
    }

    @Test
    void createSavesWithIncrementingSortOrder() {
        UUID userId = UUID.randomUUID();
        CourseSection section = sectionWithContext(1L, 10L);
        when(sectionRepository.findById(1L)).thenReturn(java.util.Optional.of(section));
        when(materialRepository.countBySection_Id(1L)).thenReturn(2);
        when(materialRepository.save(any(HomeworkMaterial.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var result = service.create(userId, 1L, "AUDIO", "http://x/audio.mp3", "Audio 1");

        assertThat(result.sortOrder()).isEqualTo(2);
        verify(permissionService).requireCapability(eq(userId), eq("course:manage"), eq(10L));
    }

    @Test
    void createRejectsInvalidMediaType() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> service.create(userId, 1L, "PDF", "http://x/a.pdf", null))
                .isInstanceOf(ApiException.class);

        verify(materialRepository, never()).save(any());
    }

    @Test
    void createRequiresCourseManageCapability() {
        UUID userId = UUID.randomUUID();
        CourseSection section = sectionWithContext(1L, 10L);
        when(sectionRepository.findById(1L)).thenReturn(java.util.Optional.of(section));
        doThrow(ApiException.forbidden("Thiếu quyền"))
                .when(permissionService).requireCapability(any(), any(), anyLong());

        assertThatThrownBy(() -> service.create(userId, 1L, "AUDIO", "http://x/audio.mp3", null))
                .isInstanceOf(ApiException.class);

        verify(materialRepository, never()).save(any());
    }

    @Test
    void listOrdersBySortOrder() {
        HomeworkMaterial m1 = new HomeworkMaterial();
        m1.setId(1L);
        m1.setMediaType("AUDIO");
        m1.setUrl("http://x/a.mp3");
        m1.setSortOrder(0);
        HomeworkMaterial m2 = new HomeworkMaterial();
        m2.setId(2L);
        m2.setMediaType("VIDEO");
        m2.setUrl("http://x/b.mp4");
        m2.setSortOrder(1);
        when(materialRepository.findBySection_IdOrderBySortOrderAscIdAsc(1L))
                .thenReturn(List.of(m1, m2));

        var result = service.list(1L);

        assertThat(result).extracting("id").containsExactly(1L, 2L);
    }
}
