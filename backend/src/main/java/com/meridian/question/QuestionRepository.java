package com.meridian.question;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findAllByOrderByCreatedAtDesc();

    List<Question> findByCategoryIdOrderByCreatedAtDesc(Long categoryId);

    List<Question> findByTypeOrderByCreatedAtDesc(QuestionType type);

    List<Question> findByCategoryIdAndTypeOrderByCreatedAtDesc(
            Long categoryId, QuestionType type);

    /** {@code categoryIds} = 1 danh mục + toàn bộ danh mục con cháu của nó (xem
     * {@code QuestionService#resolveCategoryIdsIncludingDescendants}) — cho phép
     * lọc câu hỏi theo cả 1 nhánh cây danh mục, không chỉ đúng 1 danh mục lá. */
    List<Question> findByCategoryIdInOrderByCreatedAtDesc(Collection<Long> categoryIds);

    List<Question> findByCategoryIdInAndTypeOrderByCreatedAtDesc(
            Collection<Long> categoryIds, QuestionType type);

    List<Question> findByCategory_AudienceOrderByCreatedAtDesc(Audience audience);

    List<Question> findByCategory_AudienceAndTypeOrderByCreatedAtDesc(
            Audience audience, QuestionType type);

    Optional<Question> findByCategoryIdAndNameIgnoreCase(Long categoryId, String name);

    Optional<Question> findByMasterQuestionId(Long masterQuestionId);
}
