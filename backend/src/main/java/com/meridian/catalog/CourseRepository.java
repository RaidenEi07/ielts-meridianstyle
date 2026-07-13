package com.meridian.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {

    boolean existsByShortname(String shortname);

    long countByStatus(CourseStatus status);

    List<Course> findByStatusOrderByCreatedAtDesc(CourseStatus status);

    List<Course> findByCategoryIdAndStatusOrderByCreatedAtDesc(
            Long categoryId, CourseStatus status);

    List<Course> findByCategory_AudienceGroupAndStatusOrderByCreatedAtDesc(
            CourseAudienceGroup audienceGroup, CourseStatus status);

    List<Course> findByCategoryIdOrderByCreatedAtDesc(Long categoryId);

    List<Course> findAllByOrderByCreatedAtDesc();

    Optional<Course> findByShortname(String shortname);
}
