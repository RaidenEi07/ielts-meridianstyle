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

/** Một hàng của câu hỏi Grid Matching — đúng khi khớp nhãn cột {@link #correctColumnLabel}. */
@Entity
@Table(name = "question_grid_rows")
@Getter
@Setter
@NoArgsConstructor
public class QuestionGridRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "row_text", nullable = false, length = 500)
    private String rowText;

    @Column(name = "correct_column_label", nullable = false, length = 120)
    private String correctColumnLabel;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
