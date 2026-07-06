package com.meridian.question;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Một ô trả lời trong câu Cloze (composite). */
@Entity
@Table(name = "question_cloze_subanswers")
@Getter
@Setter
@NoArgsConstructor
public class QuestionClozeSubAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "sub_index", nullable = false)
    private int subIndex;

    @Enumerated(EnumType.STRING)
    @Column(name = "sub_type", nullable = false, length = 20)
    private ClozeSubType subType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "accepted_answers", columnDefinition = "jsonb")
    private String acceptedAnswers;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String options;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
