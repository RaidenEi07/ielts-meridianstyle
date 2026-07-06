package com.meridian.question;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PassageRepository extends JpaRepository<Passage, Long> {

    List<Passage> findAllByOrderByCreatedAtDesc();

    Optional<Passage> findByTitleIgnoreCase(String title);
}
