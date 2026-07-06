package com.meridian.quiz;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptAnswerRepository extends JpaRepository<QuizAttemptAnswer, Long> {

    List<QuizAttemptAnswer> findByAttemptId(Long attemptId);

    Optional<QuizAttemptAnswer> findByAttemptIdAndQuizQuestionId(
            Long attemptId, Long quizQuestionId);
}
