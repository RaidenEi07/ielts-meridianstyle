package com.meridian.admin;

import com.meridian.security.CurrentUserProvider;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ConfigController {

    private final ConfigService configService;
    private final CurrentUserProvider currentUser;

    public ConfigController(ConfigService configService, CurrentUserProvider currentUser) {
        this.configService = configService;
        this.currentUser = currentUser;
    }

    /** Cấu hình branding công khai (không cần đăng nhập). */
    @GetMapping("/api/config/public")
    public Map<String, String> publicConfig() {
        return configService.publicConfig();
    }

    @GetMapping("/api/admin/config")
    public Map<String, String> allConfig() {
        return configService.allConfig(currentUser.require().id());
    }

    @PutMapping("/api/admin/config")
    public Map<String, String> update(@RequestBody Map<String, String> updates) {
        return configService.update(currentUser.require().id(), updates);
    }
}
