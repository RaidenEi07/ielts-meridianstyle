package com.meridian.dubbing;

import com.meridian.dubbing.dto.DubbingDtos.CharacterDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Đọc nhân vật + đoạn thoại — cần đăng nhập, không cần capability riêng. */
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
}
