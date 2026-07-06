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

@Entity
@Table(name = "question_matching_pairs")
@Getter
@Setter
@NoArgsConstructor
public class QuestionMatchingPair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "left_item", nullable = false, length = 500)
    private String leftItem;

    @Column(name = "right_item", nullable = false, length = 500)
    private String rightItem;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
