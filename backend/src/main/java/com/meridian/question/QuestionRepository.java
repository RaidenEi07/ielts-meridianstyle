package com.meridian.question;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findAllByOrderByCreatedAtDesc();

    List<Question> findByCategoryIdOrderByCreatedAtDesc(Long categoryId);

    List<Question> findByTypeOrderByCreatedAtDesc(QuestionType type);

    List<Question> findByCategoryIdAndTypeOrderByCreatedAtDesc(
            Long categoryId, QuestionType type);

    Optional<Question> findByCategoryIdAndNameIgnoreCase(Long categoryId, String name);
}
