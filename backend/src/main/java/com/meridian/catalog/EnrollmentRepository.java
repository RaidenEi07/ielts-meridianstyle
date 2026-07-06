package com.meridian.catalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    boolean existsByUserIdAndCourseId(UUID userId, Long courseId);

    Optional<Enrollment> findByUserIdAndCourseId(UUID userId, Long courseId);

    List<Enrollment> findByUserIdOrderByEnrolledAtDesc(UUID userId);

    long countByCourseId(Long courseId);
}
