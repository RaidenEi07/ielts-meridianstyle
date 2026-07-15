package com.meridian.game;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PointsLedgerRepository extends JpaRepository<PointsLedger, Long> {

    List<PointsLedger> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT p.userId AS userId, SUM(p.points) AS total "
            + "FROM PointsLedger p GROUP BY p.userId ORDER BY SUM(p.points) DESC")
    List<LeaderboardRow> topByTotalPoints(Pageable pageable);

    interface LeaderboardRow {
        UUID getUserId();

        long getTotal();
    }
}
