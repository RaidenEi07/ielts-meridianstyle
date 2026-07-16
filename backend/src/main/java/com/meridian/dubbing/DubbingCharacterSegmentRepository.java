package com.meridian.dubbing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DubbingCharacterSegmentRepository extends JpaRepository<DubbingCharacterSegment, Long> {

    List<DubbingCharacterSegment> findByCharacter_IdOrderBySortOrderAscIdAsc(Long characterId);

    List<DubbingCharacterSegment> findByCharacter_IdInOrderBySortOrderAscIdAsc(List<Long> characterIds);

    int countByCharacter_Id(Long characterId);
}
