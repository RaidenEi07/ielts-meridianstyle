package com.meridian.auth;

import com.meridian.auth.dto.AuthResponse;
import com.meridian.auth.dto.LoginRequest;
import com.meridian.auth.dto.MeResponse;
import com.meridian.auth.dto.RefreshRequest;
import com.meridian.auth.dto.RegisterRequest;
import com.meridian.rbac.RbacService;
import com.meridian.rbac.dto.AdminUserDto;
import com.meridian.rbac.dto.UpdateUserRequest;
import com.meridian.security.AuthenticatedUser;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUserProvider currentUserProvider;
    private final RbacService rbacService;

    public AuthController(AuthService authService,
            CurrentUserProvider currentUserProvider, RbacService rbacService) {
        this.authService = authService;
        this.currentUserProvider = currentUserProvider;
        this.rbacService = rbacService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.register(request));
    }

    @PostMapping("/register-parent")
    public ResponseEntity<AuthResponse> registerParent(
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.registerParent(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @GetMapping("/me")
    public MeResponse me() {
        AuthenticatedUser current = currentUserProvider.require();
        return authService.getCurrentUser(current.id());
    }

    @PatchMapping("/me")
    public AdminUserDto updateMe(@Valid @RequestBody UpdateUserRequest request) {
        AuthenticatedUser current = currentUserProvider.require();
        return rbacService.updateOwnProfile(current.id(), request);
    }
}
