package com.meridian.classroom;

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

/** Quan hệ "lớp này đã được gắn vào khóa này" — giữ lại để thành viên thêm sau cũng tự được ghi danh. */
@Entity
@Table(name = "school_class_courses")
@Getter
@Setter
@NoArgsConstructor
public class SchoolClassCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_id", nullable = false)
    private Long classId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;

    public SchoolClassCourse(Long classId, Long courseId) {
        this.classId = classId;
        this.courseId = courseId;
    }

    @PrePersist
    void onCreate() {
        addedAt = Instant.now();
    }
}
