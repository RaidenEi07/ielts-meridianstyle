package com.meridian.quiz;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Câu hỏi được import vào quiz (tham chiếu tới ngân hàng qua questionId). */
@Entity
@Table(name = "quiz_questions")
@Getter
@Setter
@NoArgsConstructor
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quiz_id", nullable = false)
    private Long quizId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "page_id")
    private Long pageId;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal mark = BigDecimal.ONE;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** Đoạn hướng dẫn dùng chung cho cả nhóm câu hỏi (vd "Questions 14-19 / Do
     * the following statements agree..." + chú thích YES/NO/NOT GIVEN) — chỉ
     * gán cho câu hỏi ĐẦU TIÊN của nhóm trong quiz NÀY, không đụng tới nội
     * dung câu hỏi dùng chung ở ngân hàng câu hỏi (bảng questions). null nếu
     * câu hỏi không mở đầu nhóm nào (đứng riêng, hoặc không phải câu đầu). */
    @Column(name = "group_intro", columnDefinition = "text")
    private String groupIntro;
}
