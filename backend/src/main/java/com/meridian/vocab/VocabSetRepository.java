package com.meridian.vocab;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VocabSetRepository extends JpaRepository<VocabSet, Long> {

    List<VocabSet> findBySection_IdOrderBySortOrderAscIdAsc(Long sectionId);
}
