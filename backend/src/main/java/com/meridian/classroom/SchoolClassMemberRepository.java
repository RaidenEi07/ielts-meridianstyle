package com.meridian.classroom;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SchoolClassMemberRepository extends JpaRepository<SchoolClassMember, Long> {

    Optional<SchoolClassMember> findByClassIdAndUserId(Long classId, UUID userId);

    @Query("SELECT m.userId FROM SchoolClassMember m WHERE m.classId = :classId")
    List<UUID> findUserIdsByClassId(@Param("classId") Long classId);

    /** Mỗi dòng: [classId, số thành viên] — để liệt kê mọi lớp bằng 1 truy vấn thay vì N+1. */
    @Query("SELECT m.classId, COUNT(m) FROM SchoolClassMember m GROUP BY m.classId")
    List<Object[]> countGroupedByClass();
}
