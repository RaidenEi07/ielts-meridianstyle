package com.meridian.question;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionGridRowRepository extends JpaRepository<QuestionGridRow, Long> {

    List<QuestionGridRow> findByQuestionIdOrderBySortOrderAsc(Long questionId);

    void deleteByQuestionId(Long questionId);
}
