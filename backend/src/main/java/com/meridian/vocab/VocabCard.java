package com.meridian.vocab;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 1 thẻ trong {@link VocabSet} — 1 từ/cụm từ (kèm phiên âm + nghĩa trong
 * {@code text}) hoặc 1 câu ví dụ đọc to, luôn kèm audio mẫu để nghe trước khi
 * ghi âm đọc lại.
 */
@Entity
@Table(name = "vocab_cards")
@Getter
@Setter
@NoArgsConstructor
public class VocabCard {

    public enum CardType { WORD, SENTENCE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "set_id", nullable = false)
    private VocabSet set;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", nullable = false, length = 20)
    private CardType cardType = CardType.WORD;

    @Column(nullable = false, columnDefinition = "text")
    private String text;

    @Column(name = "accepted_answer", length = 500)
    private String acceptedAnswer;

    @Column(name = "audio_url", nullable = false, length = 500)
    private String audioUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;
}
