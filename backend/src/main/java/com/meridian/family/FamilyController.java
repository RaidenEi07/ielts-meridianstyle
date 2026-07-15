package com.meridian.family;

import com.meridian.auth.dto.AuthResponse;
import com.meridian.family.dto.ChildProfileDto;
import com.meridian.family.dto.ChildProgressDto;
import com.meridian.family.dto.CreateChildRequest;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Phụ huynh quản lý hồ sơ con của chính mình. Không cần capability riêng —
 * mọi thao tác tự giới hạn theo {@code parent_id = user hiện tại}.
 */
@RestController
@RequestMapping("/api/family")
public class FamilyController {

    private final FamilyService familyService;
    private final CurrentUserProvider currentUser;

    public FamilyController(FamilyService familyService, CurrentUserProvider currentUser) {
        this.familyService = familyService;
        this.currentUser = currentUser;
    }

    @PostMapping("/children")
    public ResponseEntity<ChildProfileDto> createChild(
            @Valid @RequestBody CreateChildRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(familyService.createChildProfile(currentUser.require().id(), request));
    }

    @GetMapping("/children")
    public List<ChildProfileDto> children() {
        return familyService.listChildren(currentUser.require().id());
    }

    @DeleteMapping("/children/{childId}")
    public ResponseEntity<Void> deleteChild(@PathVariable UUID childId) {
        familyService.deleteChildProfile(currentUser.require().id(), childId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/children/{childId}/switch")
    public AuthResponse switchToChild(@PathVariable UUID childId) {
        return familyService.switchToChild(currentUser.require().id(), childId);
    }

    @GetMapping("/children/{childId}/progress")
    public ChildProgressDto childProgress(@PathVariable UUID childId) {
        return familyService.childProgress(currentUser.require().id(), childId);
    }
}
