package com.meridian.classroom;

import com.meridian.catalog.Course;
import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseStatus;
import com.meridian.catalog.EnrollmentService;
import com.meridian.catalog.dto.BulkEnrollResult;
import com.meridian.classroom.dto.ClassDtos.AddMembersResult;
import com.meridian.classroom.dto.ClassDtos.ClassCourseDto;
import com.meridian.classroom.dto.ClassDtos.ClassDetail;
import com.meridian.classroom.dto.ClassDtos.ClassMemberDto;
import com.meridian.classroom.dto.ClassDtos.ClassSummary;
import com.meridian.classroom.dto.ClassDtos.LinkCourseResult;
import com.meridian.common.ApiException;
import com.meridian.rbac.PermissionService;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lớp học = nhóm tài khoản. Gắn lớp vào khóa học thì mọi thành viên được ghi danh khóa đó; thành viên
 * thêm vào lớp SAU này cũng tự được ghi danh các khóa đã gắn. Gỡ thành viên/gỡ khóa khỏi lớp KHÔNG hủy
 * ghi danh đã có (tránh mất bài làm) — hủy ghi danh làm riêng ở trang học viên.
 *
 * <p>Quyền: 'enrollment:manage' tại SYSTEM context (admin, quản lý, quản lý chi nhánh) — cùng quyền với
 * việc ghi danh hộ học viên.
 */
@Service
public class ClassService {

    private static final String CAP = "enrollment:manage";

    private final SchoolClassRepository classRepository;
    private final SchoolClassMemberRepository memberRepository;
    private final SchoolClassCourseRepository courseLinkRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentService enrollmentService;
    private final PermissionService permissionService;

    public ClassService(SchoolClassRepository classRepository,
            SchoolClassMemberRepository memberRepository,
            SchoolClassCourseRepository courseLinkRepository, UserRepository userRepository,
            CourseRepository courseRepository, EnrollmentService enrollmentService,
            PermissionService permissionService) {
        this.classRepository = classRepository;
        this.memberRepository = memberRepository;
        this.courseLinkRepository = courseLinkRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.enrollmentService = enrollmentService;
        this.permissionService = permissionService;
    }

    private void requireManage(UUID uid) {
        permissionService.requireSystemCapability(uid, CAP);
    }

    private SchoolClass requireClass(Long id) {
        return classRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy lớp"));
    }

    /** Danh sách lớp; truyền courseId để chỉ lấy các lớp đã gắn vào khóa đó. */
    @Transactional(readOnly = true)
    public List<ClassSummary> list(UUID uid, Long courseId) {
        requireManage(uid);
        Map<Long, Integer> members = countMap(memberRepository.countGroupedByClass());
        Map<Long, Integer> courses = countMap(courseLinkRepository.countGroupedByClass());
        Set<Long> linkedToCourse = null;
        if (courseId != null) {
            linkedToCourse = new HashSet<>();
            for (SchoolClassCourse link : courseLinkRepository.findByCourseId(courseId)) {
                linkedToCourse.add(link.getClassId());
            }
        }
        List<ClassSummary> out = new ArrayList<>();
        for (SchoolClass c : classRepository.findAllByOrderByNameAsc()) {
            if (linkedToCourse != null && !linkedToCourse.contains(c.getId())) {
                continue;
            }
            out.add(new ClassSummary(c.getId(), c.getName(), c.getDescription(),
                    members.getOrDefault(c.getId(), 0), courses.getOrDefault(c.getId(), 0)));
        }
        return out;
    }

    private Map<Long, Integer> countMap(List<Object[]> rows) {
        Map<Long, Integer> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue());
        }
        return map;
    }

    @Transactional(readOnly = true)
    public ClassDetail detail(UUID uid, Long classId) {
        requireManage(uid);
        SchoolClass c = requireClass(classId);

        List<UUID> memberIds = memberRepository.findUserIdsByClassId(classId);
        List<ClassMemberDto> members = userRepository.findAllById(memberIds).stream()
                .sorted(Comparator.comparing(User::getFullName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(u -> new ClassMemberDto(u.getId(), u.getUsername(), u.getFullName(), u.getEmail(),
                        u.getStatus().name()))
                .toList();

        List<Long> courseIds = courseLinkRepository.findByClassId(classId).stream()
                .map(SchoolClassCourse::getCourseId).toList();
        List<ClassCourseDto> courses = courseRepository.findAllById(courseIds).stream()
                .sorted(Comparator.comparing(Course::getTitle, String.CASE_INSENSITIVE_ORDER))
                .map(co -> new ClassCourseDto(co.getId(), co.getTitle(), co.getStatus().name()))
                .toList();
        return new ClassDetail(c.getId(), c.getName(), c.getDescription(), members, courses);
    }

    @Transactional
    public ClassSummary create(UUID uid, String name, String description) {
        requireManage(uid);
        String clean = name.trim();
        if (classRepository.existsByNameIgnoreCase(clean)) {
            throw ApiException.conflict("Đã có lớp tên \"" + clean + "\"");
        }
        SchoolClass c = new SchoolClass();
        c.setName(clean);
        c.setDescription(blankToNull(description));
        c.setCreatedBy(uid);
        c = classRepository.save(c);
        return new ClassSummary(c.getId(), c.getName(), c.getDescription(), 0, 0);
    }

    @Transactional
    public ClassSummary update(UUID uid, Long classId, String name, String description) {
        requireManage(uid);
        SchoolClass c = requireClass(classId);
        String clean = name.trim();
        if (classRepository.existsByNameIgnoreCaseAndIdNot(clean, classId)) {
            throw ApiException.conflict("Đã có lớp tên \"" + clean + "\"");
        }
        c.setName(clean);
        c.setDescription(blankToNull(description));
        c = classRepository.save(c);
        int members = memberRepository.findUserIdsByClassId(classId).size();
        int courses = courseLinkRepository.findByClassId(classId).size();
        return new ClassSummary(c.getId(), c.getName(), c.getDescription(), members, courses);
    }

    /** Xóa lớp (thành viên và liên kết khóa học xóa theo); ghi danh khóa học đã có được giữ nguyên. */
    @Transactional
    public void delete(UUID uid, Long classId) {
        requireManage(uid);
        classRepository.delete(requireClass(classId));
    }

    @Transactional
    public AddMembersResult addMembers(UUID uid, Long classId, List<UUID> userIds) {
        requireManage(uid);
        requireClass(classId);

        Set<UUID> requested = new LinkedHashSet<>(userIds);
        List<User> found = userRepository.findAllById(requested);
        int notFound = requested.size() - found.size();
        Set<UUID> existing = new HashSet<>(memberRepository.findUserIdsByClassId(classId));
        List<UUID> toAdd = found.stream().map(User::getId).filter(id -> !existing.contains(id)).toList();
        for (UUID id : toAdd) {
            memberRepository.save(new SchoolClassMember(classId, id));
        }

        int newlyEnrolled = 0;
        if (!toAdd.isEmpty()) {
            for (SchoolClassCourse link : courseLinkRepository.findByClassId(classId)) {
                Course course = courseRepository.findById(link.getCourseId()).orElse(null);
                // Khóa đã bị xóa hoặc chuyển về nháp: bỏ qua, không làm hỏng việc thêm thành viên.
                if (course == null || course.getStatus() != CourseStatus.PUBLISHED) {
                    continue;
                }
                newlyEnrolled += enrollmentService.enrollUsersInCourse(toAdd, course.getId()).enrolled();
            }
        }
        return new AddMembersResult(toAdd.size(), found.size() - toAdd.size(), notFound, newlyEnrolled);
    }

    /** Gỡ thành viên khỏi lớp. KHÔNG hủy ghi danh khóa học của người đó. */
    @Transactional
    public void removeMember(UUID uid, Long classId, UUID userId) {
        requireManage(uid);
        requireClass(classId);
        SchoolClassMember member = memberRepository.findByClassIdAndUserId(classId, userId)
                .orElseThrow(() -> ApiException.notFound("Tài khoản này không thuộc lớp"));
        memberRepository.delete(member);
    }

    /** Gắn lớp vào khóa học: ghi danh mọi thành viên hiện tại, và nhớ liên kết để thành viên mới cũng tự được ghi danh. */
    @Transactional
    public LinkCourseResult linkCourse(UUID uid, Long classId, Long courseId) {
        requireManage(uid);
        requireClass(classId);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khóa học"));
        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw ApiException.badRequest("Khóa học chưa được xuất bản nên chưa gắn lớp vào được");
        }
        if (courseLinkRepository.findByClassIdAndCourseId(classId, courseId).isEmpty()) {
            courseLinkRepository.save(new SchoolClassCourse(classId, courseId));
        }
        List<UUID> memberIds = memberRepository.findUserIdsByClassId(classId);
        if (memberIds.isEmpty()) {
            return new LinkCourseResult(0, 0, 0);
        }
        BulkEnrollResult result = enrollmentService.enrollUsersInCourse(memberIds, courseId);
        return new LinkCourseResult(memberIds.size(), result.enrolled(), result.alreadyEnrolled());
    }

    /** Gỡ liên kết lớp–khóa. KHÔNG hủy ghi danh những người đã vào khóa. */
    @Transactional
    public void unlinkCourse(UUID uid, Long classId, Long courseId) {
        requireManage(uid);
        requireClass(classId);
        SchoolClassCourse link = courseLinkRepository.findByClassIdAndCourseId(classId, courseId)
                .orElseThrow(() -> ApiException.notFound("Lớp chưa được gắn vào khóa này"));
        courseLinkRepository.delete(link);
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
