package com.meridian.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseCategoryRepository extends JpaRepository<CourseCategory, Long> {

    Optional<CourseCategory> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<CourseCategory> findAllByOrderByNameAsc();
}
