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

/** Item kéo-thả: target là số placeholder ([[1]]) cho text, hoặc nhãn zone cho marker. */
@Entity
@Table(name = "question_dragdrop_items")
@Getter
@Setter
@NoArgsConstructor
public class QuestionDragDropItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "correct_target", length = 120)
    private String correctTarget;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
