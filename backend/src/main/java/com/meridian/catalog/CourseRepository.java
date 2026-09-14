package com.meridian.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseRepository extends JpaRepository<Course, Long> {

    boolean existsByShortname(String shortname);

    long countByStatus(CourseStatus status);

    List<Course> findByStatusOrderByCreatedAtDesc(CourseStatus status);

    List<Course> findByCategoryIdAndStatusOrderByCreatedAtDesc(
            Long categoryId, CourseStatus status);

    List<Course> findByCategory_AudienceGroupAndStatusOrderByCreatedAtDesc(
            CourseAudienceGroup audienceGroup, CourseStatus status);

    List<Course> findByCategoryIdOrderByCreatedAtDesc(Long categoryId);

    List<Course> findAllByOrderByCreatedAtDesc();

    Optional<Course> findByShortname(String shortname);

    /** Chỉ CourseImportService gọi, NGAY SAU khi ghi xong nội dung mới nhất
     * từ web tổng — cố ý dùng UPDATE JPQL thẳng (không qua entity/@PreUpdate)
     * để không tự bật {@code locallyModified} lại thành true ngay lập tức. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Course c SET c.locallyModified = false WHERE c.id = :id")
    void clearLocallyModified(@Param("id") Long id);
}
