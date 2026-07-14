package com.meridian.progress;

import com.meridian.catalog.CourseSection;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Đánh dấu một buổi học ({@link CourseSection}) đã hoàn thành đối với một
 * user. Chỉ tạo dòng KHI hoàn thành — tồn tại dòng nghĩa là đã hoàn thành,
 * không track trạng thái "đang học dở".
 */
@Entity
@Table(name = "lesson_progress")
@Getter
@Setter
@NoArgsConstructor
public class LessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private CourseSection section;

    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    @PrePersist
    void onCreate() {
        if (completedAt == null) {
            completedAt = Instant.now();
        }
    }
}
