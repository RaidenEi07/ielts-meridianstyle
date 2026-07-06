package com.meridian.quiz;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizPageRepository extends JpaRepository<QuizPage, Long> {

    List<QuizPage> findByQuizIdOrderByPageNumberAsc(Long quizId);

    void deleteByQuizId(Long quizId);
}
