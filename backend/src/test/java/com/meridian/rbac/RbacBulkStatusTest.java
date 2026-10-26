package com.meridian.rbac;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meridian.catalog.CourseRepository;
import com.meridian.common.ApiException;
import com.meridian.rbac.dto.BulkStatusResult;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Khóa / mở khóa nhiều tài khoản: không tự khóa mình, mở khóa xóa luôn khóa tạm do đăng nhập sai. */
@ExtendWith(MockitoExtension.class)
class RbacBulkStatusTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private CapabilityRepository capabilityRepository;
    @Mock private RoleAssignmentRepository roleAssignmentRepository;
    @Mock private UserCapabilityGrantRepository userCapabilityGrantRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private ContextService contextService;
    @Mock private PermissionService permissionService;
    @Mock private PasswordEncoder passwordEncoder;

    private RbacService service;
    private final UUID actor = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new RbacService(userRepository, roleRepository, capabilityRepository,
                roleAssignmentRepository, userCapabilityGrantRepository, courseRepository,
                contextService, permissionService, passwordEncoder);
    }

    private User user(UUID id, UserStatus status) {
        User u = new User();
        u.setId(id);
        u.setStatus(status);
        return u;
    }

    @Test
    void suspend_skipsTheActor_andCountsMissingAccounts() {
        UUID other = UUID.randomUUID();
        UUID ghost = UUID.randomUUID();
        User me = user(actor, UserStatus.ACTIVE);
        User them = user(other, UserStatus.ACTIVE);
        when(userRepository.findAllById(any())).thenReturn(List.of(me, them));

        BulkStatusResult result = service.bulkSetStatus(actor, List.of(actor, other, ghost), "suspended");

        assertThat(result.updated()).isEqualTo(1);
        assertThat(result.skippedSelf()).isEqualTo(1);
        assertThat(result.notFound()).isEqualTo(1);
        assertThat(them.getStatus()).isEqualTo(UserStatus.SUSPENDED);
        assertThat(me.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(userRepository).save(them);
        verify(userRepository, never()).save(me);
    }

    @Test
    void activate_alsoClearsTemporaryLoginLockout() {
        UUID other = UUID.randomUUID();
        User locked = user(other, UserStatus.SUSPENDED);
        locked.setFailedLoginAttempts(5);
        locked.setLockedUntil(Instant.now().plusSeconds(600));
        when(userRepository.findAllById(any())).thenReturn(List.of(locked));

        service.bulkSetStatus(actor, List.of(other), "ACTIVE");

        assertThat(locked.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(locked.getFailedLoginAttempts()).isZero();
        assertThat(locked.getLockedUntil()).isNull();
    }

    @Test
    void onlyActiveOrSuspendedAreAccepted() {
        assertThatThrownBy(() -> service.bulkSetStatus(actor, List.of(UUID.randomUUID()), "PENDING"))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.bulkSetStatus(actor, List.of(UUID.randomUUID()), "banana"))
                .isInstanceOf(ApiException.class);
        verify(userRepository, never()).save(any());
    }
}
