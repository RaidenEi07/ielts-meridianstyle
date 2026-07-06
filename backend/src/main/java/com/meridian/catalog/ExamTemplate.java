package com.meridian.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Hồ sơ thi (IELTS/TOEFL...) điều khiển giao diện và quy tắc làm bài.
 * Các cột cấu hình lưu JSON (chuỗi JSON thô) để linh hoạt mở rộng.
 */
@Entity
@Table(name = "exam_templates")
@Getter
@Setter
@NoArgsConstructor
public class ExamTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "skill_layout_config", columnDefinition = "jsonb")
    private String skillLayoutConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "timer_rules", columnDefinition = "jsonb")
    private String timerRules;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "band_score_conversion", columnDefinition = "jsonb")
    private String bandScoreConversion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
