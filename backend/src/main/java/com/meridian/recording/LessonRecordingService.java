package com.meridian.recording;

import com.meridian.catalog.CourseSection;
import com.meridian.catalog.CourseSectionRepository;
import com.meridian.catalog.EnrollmentRepository;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.recording.dto.AdminLessonRecordingDto;
import com.meridian.recording.dto.LessonRecordingDto;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Ghi âm luyện nói tự do — độc lập với lesson_progress/mở khóa tuần tự. */
@Service
public class LessonRecordingService {

    private static final String CAP = "course:manage";

    private final LessonRecordingRepository recordingRepository;
    private final CourseSectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final ContextService contextService;

    public LessonRecordingService(LessonRecordingRepository recordingRepository,
            CourseSectionRepository sectionRepository, EnrollmentRepository enrollmentRepository,
            UserRepository userRepository, PermissionService permissionService,
            ContextService contextService) {
        this.recordingRepository = recordingRepository;
        this.sectionRepository = sectionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.contextService = contextService;
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

    /** Giáo viên xem toàn bộ bản ghi âm của 1 section (mọi học viên) để chấm sao. */
    @Transactional(readOnly = true)
    public List<AdminLessonRecordingDto> listRecordingsForTeacher(UUID teacherId, Long sectionId) {
        CourseSection section = requireSection(sectionId);
        permissionService.requireCapability(teacherId, CAP, contextIdOf(section.getCourse().getContext()));

        List<LessonRecording> recordings = recordingRepository.findBySection_IdOrderByCreatedAtDesc(sectionId);
        Map<UUID, User> users = userRepository
                .findAllById(recordings.stream().map(LessonRecording::getUserId).distinct().toList())
                .stream().collect(java.util.stream.Collectors.toMap(User::getId, u -> u));
        return recordings.stream()
                .map(r -> new AdminLessonRecordingDto(r.getId(), r.getUserId(),
                        users.containsKey(r.getUserId()) ? users.get(r.getUserId()).getFullName() : "(đã xóa)",
                        r.getAudioUrl(), r.getStarRating(), r.getCreatedAt()))
                .toList();
    }

    /** Giáo viên chấm 1-5 sao cho 1 bản ghi âm. */
    @Transactional
    public void rateRecording(UUID teacherId, Long recordingId, int starRating) {
        if (starRating < 1 || starRating > 5) {
            throw ApiException.badRequest("Số sao phải từ 1 đến 5");
        }
        LessonRecording recording = recordingRepository.findById(recordingId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bản ghi âm"));
        permissionService.requireCapability(teacherId, CAP,
                contextIdOf(recording.getSection().getCourse().getContext()));
        recording.setStarRating(starRating);
        recordingRepository.save(recording);
    }

    private CourseSection requireSection(Long id) {
        return sectionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy section"));
    }

    private Long contextIdOf(Context ctx) {
        return ctx == null ? contextService.requireSystemContext().getId() : ctx.getId();
    }

    private static LessonRecordingDto toDto(LessonRecording recording) {
        return new LessonRecordingDto(recording.getId(), recording.getAudioUrl(),
                recording.getStarRating(), recording.getCreatedAt());
    }
}
