package com.meridian.progress;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

    boolean existsByUserIdAndSectionId(UUID userId, Long sectionId);

    List<LessonProgress> findByUserIdAndSection_Course_Id(UUID userId, Long courseId);
}
