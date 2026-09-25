package com.meridian.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AssignableTypeFilter;

class DemoSeedGatingTest {

    // Seeders tạo giáo viên/khóa học mẫu (có mật khẩu mặc định) — mọi runner mới phải gắn công tắc, trừ tạo admin.
    @Test
    void everyStartupRunnerExceptAdminBootstrapIsGatedBySeedDemoDataFlag() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(CommandLineRunner.class));

        List<String> ungated = new ArrayList<>();
        int seen = 0;
        for (BeanDefinition definition : scanner.findCandidateComponents("com.meridian")) {
            Class<?> type = Class.forName(definition.getBeanClassName());
            if (type == DataInitializer.class) {
                continue;
            }
            seen++;
            ConditionalOnProperty condition = type.getAnnotation(ConditionalOnProperty.class);
            boolean gated = condition != null
                    && List.of(condition.name()).contains("meridian.seed-demo-data")
                    && condition.matchIfMissing();
            if (!gated) {
                ungated.add(type.getSimpleName());
            }
        }
        assertThat(seen).as("seeders found").isGreaterThanOrEqualTo(6);
        assertThat(ungated).as("runners not gated by meridian.seed-demo-data").isEmpty();
    }
}
