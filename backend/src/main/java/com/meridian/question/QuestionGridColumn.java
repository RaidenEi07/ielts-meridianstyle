package com.meridian.question;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cột dùng chung cho câu hỏi Trắc nghiệm dạng lưới/bảng (Grid Matching). */
@Entity
@Table(name = "question_grid_columns")
@Getter
@Setter
@NoArgsConstructor
public class QuestionGridColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(nullable = false, length = 120)
    private String label;

    /** Đoạn mô tả cho cột này (vd "The alone condition") — hiện trong bảng
     * chú giải SAU lưới chấm điểm, tách khỏi stem. null/rỗng = cột không có
     * mô tả riêng, không hiện dòng nào trong bảng chú giải cho cột đó. */
    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
