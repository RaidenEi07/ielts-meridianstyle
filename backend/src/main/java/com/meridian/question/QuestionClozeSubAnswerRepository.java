package com.meridian.question;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionClozeSubAnswerRepository
        extends JpaRepository<QuestionClozeSubAnswer, Long> {

    List<QuestionClozeSubAnswer> findByQuestionIdOrderBySubIndexAsc(Long questionId);

    void deleteByQuestionId(Long questionId);
}
