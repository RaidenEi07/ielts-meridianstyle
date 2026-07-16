package com.meridian.dubbing;

import com.meridian.dubbing.dto.DubbingDtos.CharacterDto;
import com.meridian.dubbing.dto.DubbingDtos.SegmentDto;
import com.meridian.security.CurrentUserProvider;
import java.math.BigDecimal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Quản lý nhân vật + đoạn thoại — kiểm quyền 'course:manage' trong DubbingService. */
@RestController
@RequestMapping("/api/admin/dubbing")
public class DubbingAdminController {

    private final DubbingService dubbingService;
    private final CurrentUserProvider currentUser;

    public DubbingAdminController(DubbingService dubbingService, CurrentUserProvider currentUser) {
        this.dubbingService = dubbingService;
        this.currentUser = currentUser;
    }

    @PostMapping("/sections/{sectionId}/characters")
    public ResponseEntity<CharacterDto> createCharacter(@PathVariable Long sectionId,
            @RequestBody Map<String, String> body) {
        CharacterDto dto = dubbingService.createCharacter(currentUser.require().id(), sectionId, body.get("name"));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/characters/{id}")
    public ResponseEntity<Void> deleteCharacter(@PathVariable Long id) {
        dubbingService.deleteCharacter(currentUser.require().id(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/characters/{characterId}/segments")
    public ResponseEntity<SegmentDto> addSegment(@PathVariable Long characterId,
            @RequestBody Map<String, BigDecimal> body) {
        SegmentDto dto = dubbingService.addSegment(currentUser.require().id(), characterId,
                body.get("startSeconds"), body.get("endSeconds"));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/segments/{id}")
    public ResponseEntity<Void> deleteSegment(@PathVariable Long id) {
        dubbingService.deleteSegment(currentUser.require().id(), id);
        return ResponseEntity.noContent().build();
    }
}
