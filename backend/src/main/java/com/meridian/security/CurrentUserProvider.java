package com.meridian.security;

import com.meridian.common.ApiException;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Truy xuất {@link AuthenticatedUser} hiện tại từ SecurityContext.
 */
@Component
public class CurrentUserProvider {

    /** Id người đang đăng nhập, hoặc null nếu request ẩn danh (dùng cho endpoint công khai có thêm quyền cho người đăng nhập). */
    public UUID optionalUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) {
            return user.id();
        }
        return null;
    }

    public AuthenticatedUser require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user)) {
            throw ApiException.unauthorized("Chưa đăng nhập");
        }
        return user;
    }
}
