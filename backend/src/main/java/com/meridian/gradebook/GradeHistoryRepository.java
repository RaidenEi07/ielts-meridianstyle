package com.meridian.gradebook;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GradeHistoryRepository extends JpaRepository<GradeHistory, Long> {

    List<GradeHistory> findByAttemptIdOrderByCreatedAtDesc(Long attemptId);
}
