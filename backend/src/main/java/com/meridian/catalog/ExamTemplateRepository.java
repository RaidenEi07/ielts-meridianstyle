package com.meridian.catalog;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExamTemplateRepository extends JpaRepository<ExamTemplate, Long> {

    Optional<ExamTemplate> findByCode(String code);
}
