package com.meridian.rbac;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "capabilities")
@Getter
@Setter
@NoArgsConstructor
public class Capability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Namespace dạng 'course:manage', 'quiz:regrade'... */
    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(length = 255)
    private String description;
}
