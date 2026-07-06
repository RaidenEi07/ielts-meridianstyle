package com.meridian.quiz;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    List<QuizAttempt> findByQuizIdAndUserIdOrderByAttemptNumberDesc(Long quizId, UUID userId);

    List<QuizAttempt> findByQuizIdOrderByStartedAtDesc(Long quizId);

    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(UUID userId);

    long countByQuizIdAndUserId(Long quizId, UUID userId);
}
