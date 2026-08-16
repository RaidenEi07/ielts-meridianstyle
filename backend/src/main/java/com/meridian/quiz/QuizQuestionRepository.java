package com.meridian.quiz;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    List<QuizQuestion> findByQuizIdOrderBySortOrderAscIdAsc(Long quizId);

    boolean existsByQuizIdAndQuestionId(Long quizId, Long questionId);

    Optional<QuizQuestion> findByQuizIdAndQuestionId(Long quizId, Long questionId);

    long countByQuizId(Long quizId);

    List<QuizQuestion> findByPageId(Long pageId);
}
