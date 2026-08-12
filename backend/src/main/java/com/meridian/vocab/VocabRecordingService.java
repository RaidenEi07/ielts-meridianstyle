package com.meridian.vocab;

import com.meridian.common.ApiException;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.vocab.dto.VocabDtos.AdminVocabRecordingDto;
import com.meridian.vocab.dto.VocabDtos.VocabRecordingDto;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Học sinh ghi âm đọc lại 1 {@link VocabCard}, giáo viên chấm sao. */
@Service
public class VocabRecordingService {

    private final VocabRecordingRepository recordingRepository;
    private final VocabService vocabService;
    private final UserRepository userRepository;

    public VocabRecordingService(VocabRecordingRepository recordingRepository, VocabService vocabService,
            UserRepository userRepository) {
        this.recordingRepository = recordingRepository;
        this.vocabService = vocabService;
        this.userRepository = userRepository;
    }

    @Transactional
    public VocabRecordingDto saveRecording(UUID userId, Long cardId, String audioUrl) {
        VocabCard card = vocabService.requireCard(cardId);
        // chỉ cần đã ghi danh khóa chứa thẻ này — tái dùng luôn kiểm tra của
        // VocabService qua getSetDetail (ném lỗi 403 nếu chưa ghi danh)
        vocabService.getSetDetail(userId, card.getSet().getId());
        if (audioUrl == null || audioUrl.isBlank()) {
            throw ApiException.badRequest("Thiếu file ghi âm");
        }
        VocabRecording recording = new VocabRecording();
        recording.setUserId(userId);
        recording.setCard(card);
        recording.setAudioUrl(audioUrl);
        recording = recordingRepository.save(recording);
        return toDto(recording);
    }

    @Transactional(readOnly = true)
    public List<VocabRecordingDto> listMyRecordings(UUID userId, Long cardId) {
        return recordingRepository.findByUserIdAndCard_IdOrderByCreatedAtDesc(userId, cardId).stream()
                .map(VocabRecordingService::toDto)
                .toList();
    }

    @Transactional
    public void deleteRecording(UUID userId, Long recordingId) {
        recordingRepository.deleteByIdAndUserId(recordingId, userId);
    }

    /** Giáo viên xem toàn bộ bản ghi âm của 1 bộ thẻ (mọi học viên) để chấm sao. */
    @Transactional(readOnly = true)
    public List<AdminVocabRecordingDto> listRecordingsForTeacher(UUID teacherId, Long setId) {
        // kiểm quyền qua getSetDetailForAdmin (ném lỗi nếu thiếu course:manage)
        vocabService.getSetDetailForAdmin(teacherId, setId);
        List<VocabRecording> recordings = recordingRepository.findByCard_Set_IdOrderByCreatedAtDesc(setId);
        Map<UUID, User> users = userRepository
                .findAllById(recordings.stream().map(VocabRecording::getUserId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, u -> u));
        return recordings.stream()
                .map(r -> new AdminVocabRecordingDto(r.getId(), r.getUserId(),
                        users.containsKey(r.getUserId()) ? users.get(r.getUserId()).getFullName() : "(đã xóa)",
                        r.getCard().getId(), r.getCard().getText(), r.getAudioUrl(), r.getStarRating(),
                        r.getCreatedAt()))
                .toList();
    }

    /** Giáo viên chấm 1-5 sao cho 1 bản ghi âm. */
    @Transactional
    public void rateRecording(UUID teacherId, Long recordingId, int starRating) {
        if (starRating < 1 || starRating > 5) {
            throw ApiException.badRequest("Số sao phải từ 1 đến 5");
        }
        VocabRecording recording = recordingRepository.findById(recordingId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bản ghi âm"));
        // kiểm quyền qua set chứa thẻ của bản ghi này
        vocabService.getSetDetailForAdmin(teacherId, recording.getCard().getSet().getId());
        recording.setStarRating(starRating);
        recordingRepository.save(recording);
    }

    private static VocabRecordingDto toDto(VocabRecording r) {
        return new VocabRecordingDto(r.getId(), r.getCard().getId(), r.getAudioUrl(), r.getStarRating(),
                r.getCreatedAt());
    }
}
