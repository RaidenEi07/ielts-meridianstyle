package com.meridian.recording;

import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.common.ApiException;
import com.meridian.recording.dto.LessonRecordingDto;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Ghi âm luyện nói tự do — độc lập với lesson_progress/mở khóa tuần tự. */
@Service
public class LessonRecordingService {

    private final LessonRecordingRepository recordingRepository;
    private final CourseSectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;

    public LessonRecordingService(LessonRecordingRepository recordingRepository,
            CourseSectionRepository sectionRepository, EnrollmentRepository enrollmentRepository) {
        this.recordingRepository = recordingRepository;
        this.sectionRepository = sectionRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional
    public LessonRecordingDto saveRecording(UUID userId, Long sectionId, String audioUrl) {
        CourseSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy buổi học"));
        Long courseId = section.getCourse().getId();
        if (!enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)) {
            throw ApiException.forbidden("Bạn cần được ghi danh khóa học này trước");
        }
        LessonRecording recording = new LessonRecording();
        recording.setUserId(userId);
        recording.setSection(section);
        recording.setAudioUrl(audioUrl);
        recording = recordingRepository.save(recording);
        return toDto(recording);
    }

    @Transactional(readOnly = true)
    public List<LessonRecordingDto> listRecordings(UUID userId, Long sectionId) {
        return recordingRepository.findByUserIdAndSection_IdOrderByCreatedAtDesc(userId, sectionId).stream()
                .map(LessonRecordingService::toDto)
                .toList();
    }

    @Transactional
    public void deleteRecording(UUID userId, Long recordingId) {
        recordingRepository.deleteByIdAndUserId(recordingId, userId);
    }

    private static LessonRecordingDto toDto(LessonRecording recording) {
        return new LessonRecordingDto(recording.getId(), recording.getAudioUrl(), recording.getCreatedAt());
    }
}
