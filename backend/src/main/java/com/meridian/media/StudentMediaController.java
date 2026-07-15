package com.meridian.media;

import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Upload audio cho user thường (vd. ghi âm luyện nói, Phase 15) — chỉ cần
 * đăng nhập, không cần capability 'question:manage'/'course:manage' như
 * {@link MediaController}. Tái dùng nguyên {@link MediaService}.
 */
@RestController
@RequestMapping("/api/media")
public class StudentMediaController {

    private final MediaService mediaService;

    public StudentMediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @PostMapping("/audio")
    public Map<String, String> uploadAudio(@RequestParam("file") MultipartFile file) {
        String url = mediaService.storeAudio(file);
        return Map.of("url", url);
    }
}
