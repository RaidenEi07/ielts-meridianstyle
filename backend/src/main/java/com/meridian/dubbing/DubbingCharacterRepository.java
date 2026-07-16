package com.meridian.dubbing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DubbingCharacterRepository extends JpaRepository<DubbingCharacter, Long> {

    List<DubbingCharacter> findBySection_IdOrderBySortOrderAscIdAsc(Long sectionId);

    int countBySection_Id(Long sectionId);
}
