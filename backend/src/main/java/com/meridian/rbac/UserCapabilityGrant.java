package com.meridian.rbac;

import com.meridian.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Quyền LẺ gán trực tiếp cho 1 user tại 1 context (thường là 1 khóa học),
 * không qua role — bổ sung cho role_assignments/role_capabilities khi cần
 * tùy biến quyền khác nhau giữa từng tài khoản, khác nhau theo từng khóa.
 * Xem V47 + PermissionService.getEffectiveCapabilities().
 */
@Entity
@Table(name = "user_capability_grants")
@Getter
@Setter
@NoArgsConstructor
public class UserCapabilityGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "capability_id", nullable = false)
    private Capability capability;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "context_id", nullable = false)
    private Context context;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Permission permission = Permission.ALLOW;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
