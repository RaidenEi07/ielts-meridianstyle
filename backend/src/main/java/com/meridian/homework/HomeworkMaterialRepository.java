package com.meridian.homework;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HomeworkMaterialRepository extends JpaRepository<HomeworkMaterial, Long> {

    List<HomeworkMaterial> findBySection_IdOrderBySortOrderAscIdAsc(Long sectionId);

    int countBySection_Id(Long sectionId);
}
