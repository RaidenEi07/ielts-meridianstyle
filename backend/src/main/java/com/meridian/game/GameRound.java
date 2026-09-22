package com.meridian.game;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 1 lượt chơi game hóa (V51) — CHÍNH SERVER tạo ra khi bắt đầu (biết chắc
 * gameMode/tổng số câu-cặp thật), server tự cộng dồn correctCount trong
 * suốt lượt chơi (xem GameService.checkRaceAnswer) — điểm thưởng lúc kết
 * thúc tính từ đúng bản ghi này, không nhận "points" do client tự báo nữa
 * (xem lịch sử: trước đây POST /api/game/points nhận thẳng số client gửi,
 * không xác minh gì — lỗ hổng can thiệp tham số).
 */
@Entity
@Table(name = "game_rounds")
@Getter
@Setter
@NoArgsConstructor
public class GameRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** "memory_match" | "quick_race" — do server tự gán lúc tạo, KHÔNG bao
     * giờ nhận trực tiếp từ client (loại bỏ luôn 1 tham số client có thể
     * từng can thiệp). */
    @Column(name = "game_mode", nullable = false, length = 20)
    private String gameMode;

    /** Tổng số câu (Đua trả lời nhanh) hoặc số cặp (Lật thẻ) THẬT SỰ đã
     * phát cho lượt này — do server tự đếm lúc tạo. */
    @Column(name = "total_items", nullable = false)
    private int totalItems;

    /** Chỉ có ý nghĩa với Đua trả lời nhanh — server tự +1 mỗi lần
     * checkRaceAnswer() xác nhận đúng VÀ câu đó chưa từng được tính (chặn
     * gọi lặp lại cùng 1 câu để cày điểm). Lật thẻ không có ý nghĩa dò đúng/
     * sai từng cặp phía server (xem javadoc GameService.finishRound) nên
     * trường này giữ 0 với gameMode đó. */
    @Column(name = "correct_count", nullable = false)
    private int correctCount = 0;

    /** JSON mảng số (câu hỏi đã tính vào correctCount) — chỉ dùng cho Đua
     * trả lời nhanh, để không cộng trùng khi cùng 1 câu được chấm lại. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answered_question_ids", columnDefinition = "jsonb")
    private String answeredQuestionIds;

    /** Đã kết thúc (đã tính điểm) chưa — chặn gọi kết thúc 2 lần trên cùng
     * 1 lượt để cày điểm nhiều lần từ đúng 1 lượt chơi. */
    @Column(nullable = false)
    private boolean finished = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
