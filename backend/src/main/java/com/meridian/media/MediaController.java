package com.meridian.media;

import com.meridian.common.ApiException;
import com.meridian.rbac.PermissionService;
import com.meridian.security.CurrentUserProvider;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Upload ảnh dùng chung: nội dung rich-text (passage/câu hỏi) và ảnh đại diện
 * khóa học. Cho phép cả 'question:manage' lẫn 'course:manage' vì cả hai công
 * cụ soạn thảo đều cần chèn ảnh.
 */
@RestController
@RequestMapping("/api/admin/media")
public class MediaController {

    private final MediaService mediaService;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    public MediaController(MediaService mediaService, CurrentUserProvider currentUser,
            PermissionService permissionService) {
        this.mediaService = mediaService;
        this.currentUser = currentUser;
        this.permissionService = permissionService;
    }

    @PostMapping("/images")
    public Map<String, String> uploadImage(@RequestParam("file") MultipartFile file) {
        UUID uid = currentUser.require().id();
        boolean allowed = permissionService.hasSystemCapability(uid, "question:manage")
                || permissionService.hasSystemCapability(uid, "course:manage");
        if (!allowed) {
            throw ApiException.forbidden("Thiếu quyền tải ảnh lên");
        }
        String url = mediaService.storeImage(file);
        return Map.of("url", url);
    }

    @PostMapping("/audio")
    public Map<String, String> uploadAudio(@RequestParam("file") MultipartFile file) {
        UUID uid = currentUser.require().id();
        boolean allowed = permissionService.hasSystemCapability(uid, "question:manage")
                || permissionService.hasSystemCapability(uid, "course:manage");
        if (!allowed) {
            throw ApiException.forbidden("Thiếu quyền tải audio lên");
        }
        String url = mediaService.storeAudio(file);
        return Map.of("url", url);
    }

    @PostMapping("/videos")
    public Map<String, String> uploadVideo(@RequestParam("file") MultipartFile file) {
        UUID uid = currentUser.require().id();
        boolean allowed = permissionService.hasSystemCapability(uid, "question:manage")
                || permissionService.hasSystemCapability(uid, "course:manage");
        if (!allowed) {
            throw ApiException.forbidden("Thiếu quyền tải video lên");
        }
        String url = mediaService.storeVideo(file);
        return Map.of("url", url);
    }

    @PostMapping("/subtitles")
    public Map<String, String> uploadSubtitle(@RequestParam("file") MultipartFile file) {
        UUID uid = currentUser.require().id();
        boolean allowed = permissionService.hasSystemCapability(uid, "question:manage")
                || permissionService.hasSystemCapability(uid, "course:manage");
        if (!allowed) {
            throw ApiException.forbidden("Thiếu quyền tải phụ đề lên");
        }
        String url = mediaService.storeSubtitle(file);
        return Map.of("url", url);
    }
}
