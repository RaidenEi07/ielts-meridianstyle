package com.meridian.vocab;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VocabRecordingRepository extends JpaRepository<VocabRecording, Long> {

    List<VocabRecording> findByUserIdAndCard_IdOrderByCreatedAtDesc(UUID userId, Long cardId);

    List<VocabRecording> findByCard_Set_IdOrderByCreatedAtDesc(Long setId);

    void deleteByIdAndUserId(Long id, UUID userId);
}
