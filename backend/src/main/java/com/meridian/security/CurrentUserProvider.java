package com.meridian.security;

import com.meridian.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Truy xuất {@link AuthenticatedUser} hiện tại từ SecurityContext.
 */
@Component
public class CurrentUserProvider {

    public AuthenticatedUser require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user)) {
            throw ApiException.unauthorized("Chưa đăng nhập");
        }
        return user;
    }
}
