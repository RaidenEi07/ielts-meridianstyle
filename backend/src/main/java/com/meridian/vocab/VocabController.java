package com.meridian.vocab;

import com.meridian.security.CurrentUserProvider;
import com.meridian.vocab.dto.VocabDtos.VocabRecordingDto;
import com.meridian.vocab.dto.VocabDtos.VocabSetDetailDto;
import com.meridian.vocab.dto.VocabDtos.VocabSetSummaryDto;
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

/** Học sinh xem bộ thẻ luyện từ vựng/phát âm + tự ghi âm — tự giới hạn theo user đăng nhập. */
@RestController
@RequestMapping("/api/vocab")
public class VocabController {

    private final VocabService vocabService;
    private final VocabRecordingService recordingService;
    private final CurrentUserProvider currentUser;

    public VocabController(VocabService vocabService, VocabRecordingService recordingService,
            CurrentUserProvider currentUser) {
        this.vocabService = vocabService;
        this.recordingService = recordingService;
        this.currentUser = currentUser;
    }

    @GetMapping("/sections/{sectionId}")
    public List<VocabSetSummaryDto> listSets(@PathVariable Long sectionId) {
        return vocabService.listSetsForSection(currentUser.require().id(), sectionId);
    }

    @GetMapping("/sets/{setId}")
    public VocabSetDetailDto getSet(@PathVariable Long setId) {
        return vocabService.getSetDetail(currentUser.require().id(), setId);
    }

    @PostMapping("/cards/{cardId}/recordings")
    public VocabRecordingDto saveRecording(@PathVariable Long cardId, @RequestBody Map<String, String> body) {
        return recordingService.saveRecording(currentUser.require().id(), cardId, body.get("audioUrl"));
    }

    @GetMapping("/cards/{cardId}/recordings")
    public List<VocabRecordingDto> myRecordings(@PathVariable Long cardId) {
        return recordingService.listMyRecordings(currentUser.require().id(), cardId);
    }

    @DeleteMapping("/recordings/{recordingId}")
    public ResponseEntity<Void> deleteRecording(@PathVariable Long recordingId) {
        recordingService.deleteRecording(currentUser.require().id(), recordingId);
        return ResponseEntity.noContent().build();
    }
}
