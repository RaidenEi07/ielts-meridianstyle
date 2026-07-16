package com.meridian.homework;

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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tài liệu bài tập về nhà (Phase 21) — audio/video riêng cho bài tập về nhà,
 * khác với video bài giảng chính ({@code CourseSection.videoUrl}). Cho phép
 * nhiều dòng mỗi buổi học, mirror {@code lesson_recordings} (Phase 15).
 */
@Entity
@Table(name = "lesson_homework_materials")
@Getter
@Setter
@NoArgsConstructor
public class HomeworkMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private CourseSection section;

    @Column(name = "media_type", length = 10, nullable = false)
    private String mediaType;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(length = 200)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
