package com.meridian.question;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionDragDropZoneRepository
        extends JpaRepository<QuestionDragDropZone, Long> {

    List<QuestionDragDropZone> findByQuestionIdOrderBySortOrderAsc(Long questionId);

    void deleteByQuestionId(Long questionId);
}
