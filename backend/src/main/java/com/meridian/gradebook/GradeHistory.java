package com.meridian.gradebook;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Nhật ký thay đổi điểm (chấm tay / chấm lại) để audit. */
@Entity
@Table(name = "grade_history")
@Getter
@Setter
@NoArgsConstructor
public class GradeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Column(name = "answer_id")
    private Long answerId;

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "old_mark", precision = 6, scale = 2)
    private BigDecimal oldMark;

    @Column(name = "new_mark", precision = 6, scale = 2)
    private BigDecimal newMark;

    @Column(length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
