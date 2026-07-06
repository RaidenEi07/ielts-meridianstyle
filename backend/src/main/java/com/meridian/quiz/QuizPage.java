package com.meridian.quiz;

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
@Table(name = "quiz_pages")
@Getter
@Setter
@NoArgsConstructor
public class QuizPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quiz_id", nullable = false)
    private Long quizId;

    @Column(name = "page_number", nullable = false)
    private int pageNumber;

    @Column(name = "part_label", length = 120)
    private String partLabel;

    @Column(name = "passage_id")
    private Long passageId;
}
