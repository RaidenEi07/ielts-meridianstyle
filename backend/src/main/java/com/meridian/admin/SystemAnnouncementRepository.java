package com.meridian.admin;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemAnnouncementRepository
        extends JpaRepository<SystemAnnouncement, Long> {

    List<SystemAnnouncement> findByActiveTrueOrderByCreatedAtDesc();

    List<SystemAnnouncement> findAllByOrderByCreatedAtDesc();
}
