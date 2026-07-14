package com.meridian.family;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParentChildProfileRepository extends JpaRepository<ParentChildProfile, Long> {

    List<ParentChildProfile> findByParentId(UUID parentId);

    boolean existsByParentIdAndChildId(UUID parentId, UUID childId);

    void deleteByParentIdAndChildId(UUID parentId, UUID childId);
}
