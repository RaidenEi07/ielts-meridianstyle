package com.meridian.recording;

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
 * Bản ghi âm giọng nói của trẻ trong một buổi học ({@link CourseSection}).
 * Độc lập hoàn toàn với {@code lesson_progress} — không tính là hoàn thành
 * buổi học, không ảnh hưởng mở khóa tuần tự. Cho phép nhiều bản ghi cho cùng
 * (user, section), mỗi lần ghi là 1 dòng mới.
 */
@Entity
@Table(name = "lesson_recordings")
@Getter
@Setter
@NoArgsConstructor
public class LessonRecording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private CourseSection section;

    @Column(name = "audio_url", nullable = false, length = 500)
    private String audioUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
