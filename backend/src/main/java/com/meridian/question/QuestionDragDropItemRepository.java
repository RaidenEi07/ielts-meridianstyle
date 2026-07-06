package com.meridian.question;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionDragDropItemRepository
        extends JpaRepository<QuestionDragDropItem, Long> {

    List<QuestionDragDropItem> findByQuestionIdOrderBySortOrderAsc(Long questionId);

    void deleteByQuestionId(Long questionId);
}
