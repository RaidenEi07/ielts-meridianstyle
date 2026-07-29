package com.meridian.recording;

import com.meridian.recording.dto.AdminLessonRecordingDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Giáo viên xem/chấm sao bản ghi âm luyện nói — kiểm quyền 'course:manage' trong service. */
@RestController
@RequestMapping("/api/admin/recordings")
public class RecordingAdminController {

    private final LessonRecordingService recordingService;
    private final CurrentUserProvider currentUser;

    public RecordingAdminController(LessonRecordingService recordingService,
            CurrentUserProvider currentUser) {
        this.recordingService = recordingService;
        this.currentUser = currentUser;
    }

    @GetMapping("/sections/{sectionId}")
    public List<AdminLessonRecordingDto> listForSection(@PathVariable Long sectionId) {
        return recordingService.listRecordingsForTeacher(currentUser.require().id(), sectionId);
    }

    @PutMapping("/{recordingId}/rating")
    public ResponseEntity<Void> rate(@PathVariable Long recordingId,
            @RequestBody Map<String, Integer> body) {
        recordingService.rateRecording(currentUser.require().id(), recordingId, body.get("starRating"));
        return ResponseEntity.noContent().build();
    }
}
