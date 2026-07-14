package com.meridian.progress;

import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.common.ApiException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Theo dõi hoàn thành buổi học — dùng cho mở khóa tuần tự ở giao diện "Vào học". */
@Service
public class LessonProgressService {

    private final LessonProgressRepository progressRepository;
    private final CourseSectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;

    public LessonProgressService(LessonProgressRepository progressRepository,
            CourseSectionRepository sectionRepository, EnrollmentRepository enrollmentRepository) {
        this.progressRepository = progressRepository;
        this.sectionRepository = sectionRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    /** Đánh dấu hoàn thành, idempotent — dùng nội bộ (vd. hook chấm bài), không kiểm tra ghi danh. */
    @Transactional
    public void markComplete(UUID userId, Long sectionId) {
        if (progressRepository.existsByUserIdAndSectionId(userId, sectionId)) {
            return;
        }
        CourseSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy buổi học"));
        LessonProgress progress = new LessonProgress();
        progress.setUserId(userId);
        progress.setSection(section);
        progressRepository.save(progress);
    }

    /** Đánh dấu hoàn thành thủ công (buổi chỉ có video) — yêu cầu đã ghi danh khóa chứa buổi này. */
    @Transactional
    public void markCompleteAsStudent(UUID userId, Long sectionId) {
        CourseSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy buổi học"));
        Long courseId = section.getCourse().getId();
        if (!enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)) {
            throw ApiException.forbidden("Bạn cần được ghi danh khóa học này trước");
        }
        markComplete(userId, sectionId);
    }

    @Transactional(readOnly = true)
    public Set<Long> completedSectionIds(UUID userId, Long courseId) {
        return progressRepository.findByUserIdAndSection_Course_Id(userId, courseId).stream()
                .map(lp -> lp.getSection().getId())
                .collect(Collectors.toSet());
    }
}
