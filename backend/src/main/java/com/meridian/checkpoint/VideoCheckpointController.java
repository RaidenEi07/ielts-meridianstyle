package com.meridian.checkpoint;

import com.meridian.catalog.CourseAccessGuard;
import com.meridian.checkpoint.dto.CheckpointAnswerResultDto;
import com.meridian.checkpoint.dto.CheckpointQuestionDto;
import com.meridian.checkpoint.dto.VideoCheckpointDto;
import com.meridian.checkpoint.dto.VideoCheckpointRequests;
import com.meridian.common.ApiException;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class VideoCheckpointController {

    private final VideoCheckpointService checkpointService;
    private final CurrentUserProvider currentUser;
    private final CourseAccessGuard accessGuard;
    private final SectionVideoCheckpointRepository checkpointRepository;

    public VideoCheckpointController(VideoCheckpointService checkpointService,
            CurrentUserProvider currentUser, CourseAccessGuard accessGuard,
            SectionVideoCheckpointRepository checkpointRepository) {
        this.checkpointService = checkpointService;
        this.currentUser = currentUser;
        this.accessGuard = accessGuard;
        this.checkpointRepository = checkpointRepository;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping("/sections/{id}/checkpoints")
    public List<VideoCheckpointDto> listForStudent(@PathVariable Long id) {
        UUID uid = uid();
        accessGuard.requireSectionAccess(uid, id);
        return checkpointService.listForStudent(uid, id);
    }

    @PutMapping("/admin/sections/{id}/checkpoints")
    public List<VideoCheckpointDto> replaceForSection(@PathVariable Long id,
            @Valid @RequestBody VideoCheckpointRequests.ReplaceCheckpoints req) {
        return checkpointService.replaceForSection(uid(), id, req.checkpoints());
    }

    @GetMapping("/checkpoints/{id}/question")
    public CheckpointQuestionDto getPlayerQuestion(@PathVariable Long id) {
        requireCheckpointAccess(uid(), id);
        return checkpointService.getPlayerQuestion(id);
    }

    @PostMapping("/checkpoints/{id}/answer")
    public CheckpointAnswerResultDto submitAnswer(@PathVariable Long id,
            @RequestBody VideoCheckpointRequests.SubmitAnswer req) {
        UUID uid = uid();
        requireCheckpointAccess(uid, id);
        return checkpointService.submitAnswer(uid, id, req.answer());
    }

    /** Câu hỏi chèn trong video thuộc buổi học nào thì người hỏi phải được ghi danh khóa của buổi đó. */
    private void requireCheckpointAccess(UUID uid, Long checkpointId) {
        Long sectionId = checkpointRepository.findById(checkpointId)
                .map(c -> c.getSection().getId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy checkpoint"));
        accessGuard.requireSectionAccess(uid, sectionId);
    }
}
