package com.meridian.admin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cấu hình site dạng key-value. */
@Entity
@Table(name = "web_configurations")
@Getter
@Setter
@NoArgsConstructor
public class WebConfiguration {

    @Id
    @Column(name = "config_key", length = 80)
    private String key;

    @Column(columnDefinition = "text")
    private String value;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "updated_by")
    private UUID updatedBy;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
