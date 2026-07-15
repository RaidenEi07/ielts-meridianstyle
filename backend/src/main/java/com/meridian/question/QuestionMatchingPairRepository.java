package com.meridian.question;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionMatchingPairRepository
        extends JpaRepository<QuestionMatchingPair, Long> {

    List<QuestionMatchingPair> findByQuestionIdOrderBySortOrderAsc(Long questionId);

    List<QuestionMatchingPair> findByQuestionIdIn(List<Long> questionIds);

    void deleteByQuestionId(Long questionId);
}
