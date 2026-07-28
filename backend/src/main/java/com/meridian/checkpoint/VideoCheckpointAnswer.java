package com.meridian.checkpoint;

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

/** Học viên đã trả lời 1 {@link SectionVideoCheckpoint} — tồn tại dòng = đã trả lời. */
@Entity
@Table(name = "video_checkpoint_answers")
@Getter
@Setter
@NoArgsConstructor
public class VideoCheckpointAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "checkpoint_id", nullable = false)
    private Long checkpointId;

    @Column(name = "is_correct")
    private Boolean correct;

    @Column(name = "answered_at", nullable = false, updatable = false)
    private Instant answeredAt;

    @PrePersist
    void onCreate() {
        if (answeredAt == null) {
            answeredAt = Instant.now();
        }
    }
}
