package com.meridian.classroom;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "school_class_members")
@Getter
@Setter
@NoArgsConstructor
public class SchoolClassMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_id", nullable = false)
    private Long classId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;

    public SchoolClassMember(Long classId, UUID userId) {
        this.classId = classId;
        this.userId = userId;
    }

    @PrePersist
    void onCreate() {
        addedAt = Instant.now();
    }
}
