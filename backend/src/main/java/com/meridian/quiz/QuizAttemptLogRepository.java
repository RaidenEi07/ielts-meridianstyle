package com.meridian.quiz;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptLogRepository extends JpaRepository<QuizAttemptLog, Long> {

    List<QuizAttemptLog> findByAttemptIdOrderByCreatedAtAsc(Long attemptId);
}
