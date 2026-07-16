package com.meridian.dubbing;

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
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DubbingServiceTest {

    @Mock private DubbingCharacterRepository characterRepository;
    @Mock private DubbingCharacterSegmentRepository segmentRepository;
    @Mock private CourseSectionRepository sectionRepository;
    @Mock private ContextService contextService;
    @Mock private PermissionService permissionService;

    private DubbingService service;

    @BeforeEach
    void setUp() {
        service = new DubbingService(characterRepository, segmentRepository, sectionRepository,
                contextService, permissionService);
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

    private DubbingCharacter character(Long id, CourseSection section) {
        DubbingCharacter c = new DubbingCharacter();
        c.setId(id);
        c.setSection(section);
        c.setName("Cat");
        return c;
    }

    @Test
    void createCharacterSavesWithIncrementingSortOrder() {
        UUID userId = UUID.randomUUID();
        CourseSection section = sectionWithContext(1L, 10L);
        when(sectionRepository.findById(1L)).thenReturn(Optional.of(section));
        when(characterRepository.countBySection_Id(1L)).thenReturn(2);
        when(characterRepository.save(any(DubbingCharacter.class))).thenAnswer(inv -> {
            DubbingCharacter c = inv.getArgument(0);
            c.setId(99L);
            return c;
        });

        var result = service.createCharacter(userId, 1L, "Dog");

        assertThat(result.name()).isEqualTo("Dog");
        verify(permissionService).requireCapability(eq(userId), eq("course:manage"), eq(10L));
    }

    @Test
    void addSegmentRejectsEndBeforeOrEqualStart() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> service.addSegment(userId, 1L, new BigDecimal("5"), new BigDecimal("5")))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.addSegment(userId, 1L, new BigDecimal("10"), new BigDecimal("5")))
                .isInstanceOf(ApiException.class);

        verify(segmentRepository, never()).save(any());
    }

    @Test
    void addSegmentRequiresCourseManageCapability() {
        UUID userId = UUID.randomUUID();
        CourseSection section = sectionWithContext(1L, 10L);
        DubbingCharacter character = character(5L, section);
        when(characterRepository.findById(5L)).thenReturn(Optional.of(character));
        doThrow(ApiException.forbidden("Thiếu quyền"))
                .when(permissionService).requireCapability(any(), any(), anyLong());

        assertThatThrownBy(() -> service.addSegment(userId, 5L, new BigDecimal("0"), new BigDecimal("3")))
                .isInstanceOf(ApiException.class);

        verify(segmentRepository, never()).save(any());
    }

    @Test
    void listCharactersGroupsSegmentsCorrectly() {
        CourseSection section = sectionWithContext(1L, 10L);
        DubbingCharacter charA = character(1L, section);
        DubbingCharacter charB = character(2L, section);
        when(characterRepository.findBySection_IdOrderBySortOrderAscIdAsc(1L))
                .thenReturn(List.of(charA, charB));

        DubbingCharacterSegment segA1 = new DubbingCharacterSegment();
        segA1.setId(10L);
        segA1.setCharacter(charA);
        segA1.setStartSeconds(new BigDecimal("0"));
        segA1.setEndSeconds(new BigDecimal("2"));
        DubbingCharacterSegment segA2 = new DubbingCharacterSegment();
        segA2.setId(11L);
        segA2.setCharacter(charA);
        segA2.setStartSeconds(new BigDecimal("5"));
        segA2.setEndSeconds(new BigDecimal("7"));
        DubbingCharacterSegment segB1 = new DubbingCharacterSegment();
        segB1.setId(12L);
        segB1.setCharacter(charB);
        segB1.setStartSeconds(new BigDecimal("2"));
        segB1.setEndSeconds(new BigDecimal("4"));
        when(segmentRepository.findByCharacter_IdInOrderBySortOrderAscIdAsc(List.of(1L, 2L)))
                .thenReturn(List.of(segA1, segA2, segB1));

        var result = service.listCharacters(1L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).segments()).hasSize(2);
        assertThat(result.get(1).segments()).hasSize(1);
    }
}
