package com.meridian.rbac;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.meridian.common.ApiException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Kiểm tra phần lõi của RBAC: kế thừa quyền theo cây context và override bằng
 * PREVENT ở context cụ thể hơn thắng ALLOW kế thừa từ context cha.
 */
@ExtendWith(MockitoExtension.class)
class PermissionServiceTest {

    @Mock
    private ContextService contextService;

    @Mock
    private RoleAssignmentRepository roleAssignmentRepository;

    private PermissionService permissionService;

    private final UUID userId = UUID.randomUUID();
    private static final Long SYSTEM_CTX = 1L;
    private static final Long CATEGORY_CTX = 2L;
    private static final Long COURSE_CTX = 3L;

    @BeforeEach
    void setUp() {
        permissionService = new PermissionService(contextService, roleAssignmentRepository);
    }

    private record FakeGrant(Long contextId, String capabilityName, Permission permission)
            implements CapabilityGrant {
        @Override
        public Long getContextId() {
            return contextId;
        }

        @Override
        public String getCapabilityName() {
            return capabilityName;
        }

        @Override
        public Permission getPermission() {
            return permission;
        }
    }

    @Test
    void allowGrantedAtSystemIsInheritedAtMoreSpecificCourseContext() {
        // Chuỗi kế thừa: course(3) -> category(2) -> system(1), cụ thể nhất trước.
        when(contextService.getInheritanceChainIds(COURSE_CTX))
                .thenReturn(List.of(COURSE_CTX, CATEGORY_CTX, SYSTEM_CTX));
        when(roleAssignmentRepository.findGrantsForUserInContexts(eq(userId), any()))
                .thenReturn(List.of(new FakeGrant(SYSTEM_CTX, "course:manage", Permission.ALLOW)));

        boolean allowed = permissionService.hasCapability(userId, "course:manage", COURSE_CTX);

        assertThat(allowed).isTrue();
    }

    @Test
    void preventAtMoreSpecificContextOverridesInheritedAllow() {
        when(contextService.getInheritanceChainIds(COURSE_CTX))
                .thenReturn(List.of(COURSE_CTX, CATEGORY_CTX, SYSTEM_CTX));
        when(roleAssignmentRepository.findGrantsForUserInContexts(eq(userId), any()))
                .thenReturn(List.of(
                        new FakeGrant(SYSTEM_CTX, "course:manage", Permission.ALLOW),
                        new FakeGrant(COURSE_CTX, "course:manage", Permission.PREVENT)));

        boolean allowed = permissionService.hasCapability(userId, "course:manage", COURSE_CTX);

        assertThat(allowed).isFalse();
    }

    @Test
    void preventAtSameDepthWinsOverAllow() {
        when(contextService.getInheritanceChainIds(SYSTEM_CTX))
                .thenReturn(List.of(SYSTEM_CTX));
        when(roleAssignmentRepository.findGrantsForUserInContexts(eq(userId), any()))
                .thenReturn(List.of(
                        new FakeGrant(SYSTEM_CTX, "user:manage", Permission.ALLOW),
                        new FakeGrant(SYSTEM_CTX, "user:manage", Permission.PREVENT)));

        Set<String> effective = permissionService.getEffectiveCapabilities(userId, SYSTEM_CTX);

        assertThat(effective).doesNotContain("user:manage");
    }

    @Test
    void missingCapabilityIsAbsentFromEffectiveSet() {
        when(contextService.getInheritanceChainIds(SYSTEM_CTX)).thenReturn(List.of(SYSTEM_CTX));
        when(roleAssignmentRepository.findGrantsForUserInContexts(eq(userId), any()))
                .thenReturn(List.of());

        assertThat(permissionService.hasCapability(userId, "system:manage", SYSTEM_CTX)).isFalse();
    }

    @Test
    void requireCapabilityThrows403WhenMissing() {
        when(contextService.getInheritanceChainIds(SYSTEM_CTX)).thenReturn(List.of(SYSTEM_CTX));
        when(roleAssignmentRepository.findGrantsForUserInContexts(eq(userId), any()))
                .thenReturn(List.of());

        assertThatThrownBy(() ->
                permissionService.requireCapability(userId, "system:manage", SYSTEM_CTX))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(403));
    }
}
