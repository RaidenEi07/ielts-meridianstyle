package com.meridian.admin;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WebConfigurationRepository
        extends JpaRepository<WebConfiguration, String> {
}
