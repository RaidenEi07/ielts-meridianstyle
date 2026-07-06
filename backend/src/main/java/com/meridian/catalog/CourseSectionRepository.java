package com.meridian.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseSectionRepository extends JpaRepository<CourseSection, Long> {

    List<CourseSection> findByCourseIdOrderBySortOrderAscIdAsc(Long courseId);
}
