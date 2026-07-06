package com.meridian.question;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionCategoryRepository extends JpaRepository<QuestionCategory, Long> {

    List<QuestionCategory> findAllByOrderByNameAsc();

    Optional<QuestionCategory> findByNameIgnoreCase(String name);
}
