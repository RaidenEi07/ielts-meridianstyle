package com.meridian.checkpoint;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SectionVideoCheckpointRepository extends JpaRepository<SectionVideoCheckpoint, Long> {

    List<SectionVideoCheckpoint> findBySectionIdOrderBySortOrderAscIdAsc(Long sectionId);

    long countBySectionId(Long sectionId);

    void deleteBySectionId(Long sectionId);
}
