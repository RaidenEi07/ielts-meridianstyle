package com.meridian.question;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionCategoryRepository extends JpaRepository<QuestionCategory, Long> {

    List<QuestionCategory> findAllByOrderByNameAsc();

    List<QuestionCategory> findAllByAudienceOrderByNameAsc(Audience audience);

    Optional<QuestionCategory> findByNameIgnoreCase(String name);

    /** Tra cứu theo tên trong đúng 1 danh mục cha — cho phép trùng tên (vd "Reading") ở các cha khác nhau. */
    Optional<QuestionCategory> findByNameIgnoreCaseAndParent_Id(String name, Long parentId);

    Optional<QuestionCategory> findByNameIgnoreCaseAndParentIsNull(String name);
}
