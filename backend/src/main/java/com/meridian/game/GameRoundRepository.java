package com.meridian.game;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRoundRepository extends JpaRepository<GameRound, Long> {

    /** Luôn tra kèm userId — 1 lượt chơi chỉ thuộc đúng người đã tạo ra nó,
     * không được đọc/cập nhật lượt của người khác dù biết đúng id. */
    Optional<GameRound> findByIdAndUserId(Long id, UUID userId);
}
