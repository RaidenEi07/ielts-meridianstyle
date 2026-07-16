package com.meridian.dubbing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Một đoạn thời gian (giây) trong video mà {@link DubbingCharacter} đang nói. */
@Entity
@Table(name = "dubbing_character_segments")
@Getter
@Setter
@NoArgsConstructor
public class DubbingCharacterSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "character_id", nullable = false)
    private DubbingCharacter character;

    @Column(name = "start_seconds", nullable = false)
    private BigDecimal startSeconds;

    @Column(name = "end_seconds", nullable = false)
    private BigDecimal endSeconds;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
