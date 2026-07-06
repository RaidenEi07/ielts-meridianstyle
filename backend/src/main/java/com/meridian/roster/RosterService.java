package com.meridian.roster;

import com.meridian.common.ApiException;
import com.meridian.roster.dto.StudentSummaryDto;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Roster giáo viên–học sinh: gán/gỡ thủ công, độc lập với RBAC theo context. */
@Service
public class RosterService {

    private final TeacherStudentAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;

    public RosterService(TeacherStudentAssignmentRepository assignmentRepository,
            UserRepository userRepository) {
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void assignStudents(UUID teacherId, List<UUID> studentIds) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy giáo viên"));
        for (UUID studentId : studentIds) {
            if (assignmentRepository.existsByTeacherIdAndStudentId(teacherId, studentId)) {
                continue;
            }
            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy học sinh"));
            TeacherStudentAssignment assignment = new TeacherStudentAssignment();
            assignment.setTeacher(teacher);
            assignment.setStudent(student);
            assignmentRepository.save(assignment);
        }
    }

    @Transactional
    public void unassign(UUID teacherId, UUID studentId) {
        assignmentRepository.deleteByTeacherIdAndStudentId(teacherId, studentId);
    }

    @Transactional(readOnly = true)
    public List<StudentSummaryDto> listStudentsForTeacher(UUID teacherId) {
        return assignmentRepository.findByTeacherId(teacherId).stream()
                .map(a -> StudentSummaryDto.from(a.getStudent()))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isAssigned(UUID teacherId, UUID studentId) {
        return assignmentRepository.existsByTeacherIdAndStudentId(teacherId, studentId);
    }
}
