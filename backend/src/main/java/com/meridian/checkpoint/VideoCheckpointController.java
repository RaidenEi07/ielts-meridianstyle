package com.meridian.checkpoint;

import com.meridian.checkpoint.dto.CheckpointAnswerResultDto;
import com.meridian.checkpoint.dto.CheckpointQuestionDto;
import com.meridian.checkpoint.dto.VideoCheckpointDto;
import com.meridian.checkpoint.dto.VideoCheckpointRequests;
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

    public VideoCheckpointController(VideoCheckpointService checkpointService,
            CurrentUserProvider currentUser) {
        this.checkpointService = checkpointService;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping("/sections/{id}/checkpoints")
    public List<VideoCheckpointDto> listForStudent(@PathVariable Long id) {
        return checkpointService.listForStudent(uid(), id);
    }

    @PutMapping("/admin/sections/{id}/checkpoints")
    public List<VideoCheckpointDto> replaceForSection(@PathVariable Long id,
            @Valid @RequestBody VideoCheckpointRequests.ReplaceCheckpoints req) {
        return checkpointService.replaceForSection(uid(), id, req.checkpoints());
    }

    @GetMapping("/checkpoints/{id}/question")
    public CheckpointQuestionDto getPlayerQuestion(@PathVariable Long id) {
        return checkpointService.getPlayerQuestion(id);
    }

    @PostMapping("/checkpoints/{id}/answer")
    public CheckpointAnswerResultDto submitAnswer(@PathVariable Long id,
            @RequestBody VideoCheckpointRequests.SubmitAnswer req) {
        return checkpointService.submitAnswer(uid(), id, req.answer());
    }
}
