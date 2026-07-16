package com.meridian.dubbing;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DubbingRecordingRepository extends JpaRepository<DubbingRecording, Long> {

    List<DubbingRecording> findByUserIdAndSegment_IdIn(UUID userId, List<Long> segmentIds);

    void deleteByIdAndUserId(Long id, UUID userId);
}
