package com.meridian.question;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {

    List<QuestionOption> findByQuestionIdOrderBySortOrderAsc(Long questionId);

    List<QuestionOption> findByQuestionIdIn(List<Long> questionIds);

    void deleteByQuestionId(Long questionId);
}
