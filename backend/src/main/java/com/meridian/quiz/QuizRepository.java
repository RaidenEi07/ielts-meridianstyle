package com.meridian.quiz;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

    List<Quiz> findBySectionIdOrderBySortOrderAscIdAsc(Long sectionId);

    long countBySectionId(Long sectionId);
}
