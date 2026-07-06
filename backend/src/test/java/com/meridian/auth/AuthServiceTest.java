package com.meridian.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.meridian.auth.dto.LoginRequest;
import com.meridian.auth.dto.RegisterRequest;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.rbac.Role;
import com.meridian.rbac.RoleAssignment;
import com.meridian.rbac.RoleAssignmentRepository;
import com.meridian.rbac.RoleRepository;
import com.meridian.security.JwtService;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RoleAssignmentRepository roleAssignmentRepository;
    @Mock private ContextService contextService;
    @Mock private PermissionService permissionService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, roleRepository, roleAssignmentRepository,
                contextService, permissionService, passwordEncoder, jwtService);
    }

    private void stubTokenIssuance() {
        when(jwtService.generateAccessToken(any(), anyString(), anyString(), anyString()))
                .thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(), anyString(), anyString(), anyString()))
                .thenReturn("refresh-token");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
    }

    @Test
    void registerCreatesUserWithStudentRoleAndReturnsTokens() {
        when(userRepository.existsByUsernameIgnoreCase("hocvien")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("hocvien@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) {
                u.setId(UUID.randomUUID());
            }
            return u;
        });
        when(roleRepository.findByShortname("student")).thenReturn(Optional.of(new Role()));
        when(contextService.requireSystemContext()).thenReturn(new Context());
        when(roleAssignmentRepository.save(any(RoleAssignment.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        stubTokenIssuance();

        var response = authService.register(
                new RegisterRequest("hocvien", "hocvien@example.com", "Test@1234", "Học Viên"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.user().username()).isEqualTo("hocvien");
        assertThat(response.user().email()).isEqualTo("hocvien@example.com");
        assertThat(response.user().fullName()).isEqualTo("Học Viên");
    }

    @Test
    void registerRejectsDuplicateUsername() {
        when(userRepository.existsByUsernameIgnoreCase("trung")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("trung", "trung@example.com", "Test@1234", "Ai Do")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(409));
    }

    @Test
    void registerRejectsDuplicateEmailEvenWithNewUsername() {
        when(userRepository.existsByUsernameIgnoreCase("aido")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("trung@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("aido", "trung@example.com", "Test@1234", "Ai Do")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(409));
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        User user = activeUser("admin", "admin@meridian.edu.vn", "hashed");
        when(userRepository.findByUsernameIgnoreCase("admin")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Admin@123", "hashed")).thenReturn(true);
        stubTokenIssuance();

        var response = authService.login(new LoginRequest("admin", "Admin@123"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().username()).isEqualTo("admin");
    }

    @Test
    void loginFailsWithWrongPassword() {
        User user = activeUser("admin", "admin@meridian.edu.vn", "hashed");
        when(userRepository.findByUsernameIgnoreCase("admin")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(eq("wrong"), eq("hashed"))).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("admin", "wrong")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(401));
    }

    @Test
    void loginFailsForUnknownUsername() {
        when(userRepository.findByUsernameIgnoreCase("khong-ton-tai"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("khong-ton-tai", "whatever")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(401));
    }

    @Test
    void loginRejectsSuspendedAccount() {
        User user = activeUser("suspended", "suspended@example.com", "hashed");
        user.setStatus(UserStatus.SUSPENDED);
        when(userRepository.findByUsernameIgnoreCase("suspended")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Test@1234", "hashed")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest("suspended", "Test@1234")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(403));
    }

    private User activeUser(String username, String email, String passwordHash) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName("Người dùng");
        user.setPasswordHash(passwordHash);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }
}
