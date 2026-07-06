package com.meridian.media;

import com.meridian.common.ApiException;
import com.meridian.config.MeridianProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaService {

    private static final Set<String> ALLOWED_IMAGE_TYPES =
            Set.of("image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml");

    private static final Set<String> ALLOWED_AUDIO_TYPES =
            Set.of("audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave",
                    "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac");

    private final MeridianProperties properties;

    public MediaService(MeridianProperties properties) {
        this.properties = properties;
    }

    public String storeImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Chưa chọn file ảnh");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw ApiException.badRequest("Chỉ chấp nhận ảnh PNG, JPEG, GIF, WEBP hoặc SVG");
        }

        String extension = switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "image/svg+xml" -> ".svg";
            default -> "";
        };
        return store(file, "images", extension);
    }

    public String storeAudio(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Chưa chọn file audio");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AUDIO_TYPES.contains(contentType)) {
            throw ApiException.badRequest("Chỉ chấp nhận audio MP3, WAV, OGG, M4A hoặc AAC");
        }

        String extension = switch (contentType) {
            case "audio/mpeg", "audio/mp3" -> ".mp3";
            case "audio/wav", "audio/x-wav", "audio/wave" -> ".wav";
            case "audio/ogg" -> ".ogg";
            case "audio/mp4", "audio/x-m4a" -> ".m4a";
            case "audio/aac" -> ".aac";
            default -> "";
        };
        return store(file, "audio", extension);
    }

    private String store(MultipartFile file, String subDir, String extension) {
        try {
            return storeRawBytes(file.getBytes(), subDir, extension);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Lưu file thất bại");
        }
    }

    /** Ghi bytes thô (vd. đọc từ file zip import) xuống uploads/{subDir}/, trả về URL công khai. */
    public String storeRawBytes(byte[] bytes, String subDir, String extension) {
        String filename = UUID.randomUUID() + extension;
        try {
            Path dir = Path.of(properties.getUploads().getDir(), subDir);
            Files.createDirectories(dir);
            Files.write(dir.resolve(filename), bytes);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Lưu file thất bại");
        }
        return properties.getUploads().getPublicBaseUrl() + "/uploads/" + subDir + "/" + filename;
    }
}
