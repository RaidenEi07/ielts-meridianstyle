package com.meridian.question;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionGridColumnRepository extends JpaRepository<QuestionGridColumn, Long> {

    List<QuestionGridColumn> findByQuestionIdOrderBySortOrderAsc(Long questionId);

    void deleteByQuestionId(Long questionId);
}
