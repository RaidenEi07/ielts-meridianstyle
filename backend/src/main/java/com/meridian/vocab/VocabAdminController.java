package com.meridian.vocab;

import com.meridian.security.CurrentUserProvider;
import com.meridian.vocab.dto.VocabDtos.AdminVocabRecordingDto;
import com.meridian.vocab.dto.VocabDtos.CreateVocabSetRequest;
import com.meridian.vocab.dto.VocabDtos.VocabSetDetailDto;
import com.meridian.vocab.dto.VocabDtos.VocabSetSummaryDto;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Soạn/import bộ thẻ luyện từ vựng + chấm sao bản ghi âm học sinh — kiểm quyền 'course:manage' trong service. */
@RestController
@RequestMapping("/api/admin/vocab")
public class VocabAdminController {

    private final VocabService vocabService;
    private final VocabRecordingService recordingService;
    private final CurrentUserProvider currentUser;

    public VocabAdminController(VocabService vocabService, VocabRecordingService recordingService,
            CurrentUserProvider currentUser) {
        this.vocabService = vocabService;
        this.recordingService = recordingService;
        this.currentUser = currentUser;
    }

    @GetMapping("/sections/{sectionId}/sets")
    public List<VocabSetSummaryDto> listSets(@PathVariable Long sectionId) {
        return vocabService.listSetsForSectionAdmin(currentUser.require().id(), sectionId);
    }

    @PostMapping("/sections/{sectionId}/sets")
    public VocabSetDetailDto createSet(@PathVariable Long sectionId, @RequestBody CreateVocabSetRequest req) {
        return vocabService.createSet(currentUser.require().id(), sectionId, req.title(), req.cards());
    }

    @GetMapping("/sets/{setId}")
    public VocabSetDetailDto getSet(@PathVariable Long setId) {
        return vocabService.getSetDetailForAdmin(currentUser.require().id(), setId);
    }

    @DeleteMapping("/sets/{setId}")
    public ResponseEntity<Void> deleteSet(@PathVariable Long setId) {
        vocabService.deleteSet(currentUser.require().id(), setId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sets/{setId}/recordings")
    public List<AdminVocabRecordingDto> recordingsForSet(@PathVariable Long setId) {
        return recordingService.listRecordingsForTeacher(currentUser.require().id(), setId);
    }

    @PutMapping("/recordings/{recordingId}/rating")
    public ResponseEntity<Void> rate(@PathVariable Long recordingId, @RequestBody Map<String, Integer> body) {
        recordingService.rateRecording(currentUser.require().id(), recordingId, body.get("starRating"));
        return ResponseEntity.noContent().build();
    }
}
