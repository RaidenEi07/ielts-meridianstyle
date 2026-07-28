package com.meridian.checkpoint;

import com.meridian.catalog.CourseSection;
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

/**
 * Một câu hỏi popup gắn theo mốc thời gian của video trong 1
 * {@link CourseSection}. Section có >=1 checkpoint trở thành "khóa học lõi"
 * — không cần cờ riêng, 0 checkpoint = hành vi cũ không đổi.
 */
@Entity
@Table(name = "section_video_checkpoints")
@Getter
@Setter
@NoArgsConstructor
public class SectionVideoCheckpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private CourseSection section;

    @Column(name = "timestamp_sec", nullable = false, precision = 8, scale = 2)
    private BigDecimal timestampSec;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
