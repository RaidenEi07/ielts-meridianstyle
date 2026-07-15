package com.meridian.recording;

import com.meridian.recording.dto.LessonRecordingDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Ghi âm luyện nói của user hiện tại — tự giới hạn theo user đăng nhập, không cần capability riêng. */
@RestController
@RequestMapping("/api/recordings")
public class RecordingController {

    private final LessonRecordingService recordingService;
    private final CurrentUserProvider currentUser;

    public RecordingController(LessonRecordingService recordingService, CurrentUserProvider currentUser) {
        this.recordingService = recordingService;
        this.currentUser = currentUser;
    }

    @PostMapping("/sections/{sectionId}")
    public LessonRecordingDto save(@PathVariable Long sectionId, @RequestBody Map<String, String> body) {
        return recordingService.saveRecording(currentUser.require().id(), sectionId, body.get("audioUrl"));
    }

    @GetMapping("/sections/{sectionId}")
    public List<LessonRecordingDto> list(@PathVariable Long sectionId) {
        return recordingService.listRecordings(currentUser.require().id(), sectionId);
    }

    @DeleteMapping("/{recordingId}")
    public ResponseEntity<Void> delete(@PathVariable Long recordingId) {
        recordingService.deleteRecording(currentUser.require().id(), recordingId);
        return ResponseEntity.noContent().build();
    }
}
