package com.meridian.quiz;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    List<QuizQuestion> findByQuizIdOrderBySortOrderAscIdAsc(Long quizId);

    boolean existsByQuizIdAndQuestionId(Long quizId, Long questionId);

    long countByQuizId(Long quizId);
}
