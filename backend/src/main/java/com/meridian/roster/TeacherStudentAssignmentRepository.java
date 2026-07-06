package com.meridian.roster;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeacherStudentAssignmentRepository
        extends JpaRepository<TeacherStudentAssignment, Long> {

    List<TeacherStudentAssignment> findByTeacherId(UUID teacherId);

    boolean existsByTeacherIdAndStudentId(UUID teacherId, UUID studentId);

    void deleteByTeacherIdAndStudentId(UUID teacherId, UUID studentId);
}
