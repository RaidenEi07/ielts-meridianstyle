package com.meridian.question;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /** Chỉ CourseImportService gọi, NGAY SAU khi ghi xong nội dung mới nhất
     * từ web tổng — cố ý dùng UPDATE JPQL thẳng (không qua entity/@PreUpdate)
     * để không tự bật {@code locallyModified} lại thành true ngay lập tức. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Question q SET q.locallyModified = false WHERE q.id = :id")
    void clearLocallyModified(@Param("id") Long id);
}
