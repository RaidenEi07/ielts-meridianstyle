package com.meridian.vocab;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VocabCardRepository extends JpaRepository<VocabCard, Long> {

    List<VocabCard> findBySet_IdOrderBySortOrderAscIdAsc(Long setId);

    long countBySet_Id(Long setId);
}
