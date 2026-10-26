package com.meridian.classroom;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SchoolClassCourseRepository extends JpaRepository<SchoolClassCourse, Long> {

    List<SchoolClassCourse> findByClassId(Long classId);

    List<SchoolClassCourse> findByCourseId(Long courseId);

    Optional<SchoolClassCourse> findByClassIdAndCourseId(Long classId, Long courseId);

    /** Mỗi dòng: [classId, số khóa học đã gắn]. */
    @Query("SELECT c.classId, COUNT(c) FROM SchoolClassCourse c GROUP BY c.classId")
    List<Object[]> countGroupedByClass();
}
