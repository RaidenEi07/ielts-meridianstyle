package com.meridian.dubbing;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DubbingRecordingRepository extends JpaRepository<DubbingRecording, Long> {

    List<DubbingRecording> findByUserIdAndCharacter_IdOrderByCreatedAtDesc(UUID userId, Long characterId);

    List<DubbingRecording> findByUserIdAndCharacter_IdIn(UUID userId, List<Long> characterIds);

    void deleteByIdAndUserId(Long id, UUID userId);
}
