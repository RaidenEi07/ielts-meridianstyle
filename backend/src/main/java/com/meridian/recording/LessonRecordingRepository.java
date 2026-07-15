package com.meridian.recording;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRecordingRepository extends JpaRepository<LessonRecording, Long> {

    List<LessonRecording> findByUserIdAndSection_IdOrderByCreatedAtDesc(UUID userId, Long sectionId);

    void deleteByIdAndUserId(Long id, UUID userId);
}
