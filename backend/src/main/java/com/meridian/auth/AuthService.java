package com.meridian.auth;

import com.meridian.auth.dto.AuthResponse;
import com.meridian.auth.dto.LoginRequest;
import com.meridian.auth.dto.MeResponse;
import com.meridian.auth.dto.RefreshRequest;
import com.meridian.auth.dto.RegisterRequest;
import com.meridian.auth.dto.RoleAssignmentDto;
import com.meridian.auth.dto.UserDto;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.rbac.Role;
import com.meridian.rbac.RoleAssignment;
import com.meridian.rbac.RoleAssignmentRepository;
import com.meridian.rbac.RoleRepository;
import com.meridian.security.JwtService;
import com.meridian.security.TokenType;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import io.jsonwebtoken.JwtException;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String DEFAULT_ROLE = "student";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RoleAssignmentRepository roleAssignmentRepository;
    private final ContextService contextService;
    private final PermissionService permissionService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository,
            RoleAssignmentRepository roleAssignmentRepository,
            ContextService contextService, PermissionService permissionService,
            PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.roleAssignmentRepository = roleAssignmentRepository;
        this.contextService = contextService;
        this.permissionService = permissionService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw ApiException.conflict("Tên đăng nhập đã được sử dụng");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw ApiException.conflict("Email đã được sử dụng");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName());
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        // Gán role mặc định STUDENT tại SYSTEM context.
        Role studentRole = roleRepository.findByShortname(DEFAULT_ROLE)
                .orElseThrow(() -> ApiException.notFound("Chưa seed role 'student'"));
        Context systemContext = contextService.requireSystemContext();
        RoleAssignment assignment = new RoleAssignment();
        assignment.setUser(user);
        assignment.setRole(studentRole);
        assignment.setContext(systemContext);
        roleAssignmentRepository.save(assignment);

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameIgnoreCase(request.username())
                .orElseThrow(() -> ApiException.unauthorized(
                        "Tên đăng nhập hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Tên đăng nhập hoặc mật khẩu không đúng");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("Tài khoản đang bị khóa hoặc chờ duyệt");
        }

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshRequest request) {
        JwtService.ParsedToken parsed;
        try {
            parsed = jwtService.parse(request.refreshToken());
        } catch (JwtException | IllegalArgumentException ex) {
            throw ApiException.unauthorized("Refresh token không hợp lệ hoặc đã hết hạn");
        }
        if (parsed.type() != TokenType.REFRESH) {
            throw ApiException.unauthorized("Token không phải refresh token");
        }

        User user = userRepository.findById(parsed.userId())
                .orElseThrow(() -> ApiException.unauthorized("Người dùng không tồn tại"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("Tài khoản đang bị khóa hoặc chờ duyệt");
        }

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public MeResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Người dùng không tồn tại"));

        List<RoleAssignmentDto> assignments =
                roleAssignmentRepository.findByUserId(userId).stream()
                        .map(RoleAssignmentDto::from)
                        .toList();

        List<String> systemCaps = permissionService
                .getEffectiveCapabilities(userId,
                        contextService.requireSystemContext().getId())
                .stream().sorted().toList();

        return new MeResponse(UserDto.from(user), assignments, systemCaps);
    }

    private AuthResponse issueTokens(User user) {
        String access = jwtService.generateAccessToken(
                user.getId(), user.getUsername(), user.getEmail(), user.getFullName());
        String refresh = jwtService.generateRefreshToken(
                user.getId(), user.getUsername(), user.getEmail(), user.getFullName());
        return AuthResponse.of(access, refresh,
                jwtService.getAccessTokenTtlSeconds(), UserDto.from(user));
    }
}
