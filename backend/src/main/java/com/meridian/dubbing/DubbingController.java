package com.meridian.dubbing;

import com.meridian.dubbing.dto.DubbingDtos.CharacterDto;
import com.meridian.dubbing.dto.DubbingDtos.RecordingDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Đọc nhân vật + đoạn thoại, ghi âm của học sinh — cần đăng nhập, không cần capability riêng. */
@RestController
@RequestMapping("/api/dubbing")
public class DubbingController {

    private final DubbingService dubbingService;
    private final CurrentUserProvider currentUser;

    public DubbingController(DubbingService dubbingService, CurrentUserProvider currentUser) {
        this.dubbingService = dubbingService;
        this.currentUser = currentUser;
    }

    @GetMapping("/sections/{sectionId}/characters")
    public List<CharacterDto> characters(@PathVariable Long sectionId) {
        currentUser.require();
        return dubbingService.listCharacters(sectionId);
    }

    @PostMapping("/characters/{characterId}/recordings")
    public ResponseEntity<RecordingDto> saveRecording(@PathVariable Long characterId,
            @RequestBody Map<String, String> body) {
        RecordingDto dto = dubbingService.saveRecording(currentUser.require().id(), characterId,
                body.get("audioUrl"));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/sections/{sectionId}/my-recordings")
    public List<RecordingDto> myRecordings(@PathVariable Long sectionId) {
        return dubbingService.myRecordings(currentUser.require().id(), sectionId);
    }

    @DeleteMapping("/recordings/{id}")
    public ResponseEntity<Void> deleteRecording(@PathVariable Long id) {
        dubbingService.deleteRecording(currentUser.require().id(), id);
        return ResponseEntity.noContent().build();
    }
}
