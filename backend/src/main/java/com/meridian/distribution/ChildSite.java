package com.meridian.distribution;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

/**
 * 1 web con đã đăng ký với web tổng — chỉ deployment "web tổng" (isMaster)
 * mới dùng bảng này, để biết đẩy khóa học đi đâu (Lát 3/4). {@code apiKey}
 * là bí mật riêng của web con đó, cần cấu hình khớp ở phía web con để
 * endpoint nhận khóa học xác thực đúng request đến từ web tổng thật.
 */
@Entity
@Table(name = "child_sites")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class ChildSite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "base_url", nullable = false, length = 300)
    private String baseUrl;

    @Column(name = "api_key", nullable = false, length = 100)
    private String apiKey;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
