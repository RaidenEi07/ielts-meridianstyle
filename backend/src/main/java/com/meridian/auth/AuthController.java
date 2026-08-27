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
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    /** Quyền hiệu lực của CHÍNH mình tại 1 khóa học cụ thể — gồm cả quyền lẻ
     * gán riêng theo khóa (V47), thứ mà {@code systemCapabilities} ở
     * MeResponse không bao giờ thấy vì chỉ tính tại SYSTEM context. Trang
     * admin/giáo viên nào gắn với 1 khóa cụ thể (sửa khóa, sửa quiz trong
     * khóa...) nên gọi thêm endpoint này thay vì chỉ dựa vào
     * systemCapabilities, nếu không tài khoản chỉ được cấp quyền lẻ ở đúng
     * khóa đó (không có role hệ thống) sẽ luôn bị chặn "Không có quyền". */
    @GetMapping("/me/course-capabilities/{courseId}")
    public List<String> myCourseCapabilities(@PathVariable Long courseId) {
        AuthenticatedUser current = currentUserProvider.require();
        return rbacService.myEffectiveCapabilitiesAtCourse(current.id(), courseId);
    }
}
