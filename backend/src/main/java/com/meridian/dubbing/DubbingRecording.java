package com.meridian.dubbing;

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
 * Bản ghi âm giọng học sinh thay cho 1 {@link DubbingCharacterSegment} (Phase 16).
 * Cho phép nhiều bản ghi mỗi (user, segment) — bản mới nhất theo
 * {@code createdAt} là bản "đang hoạt động" khi đọc.
 */
@Entity
@Table(name = "dubbing_recordings")
@Getter
@Setter
@NoArgsConstructor
public class DubbingRecording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "segment_id", nullable = false)
    private DubbingCharacterSegment segment;

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
