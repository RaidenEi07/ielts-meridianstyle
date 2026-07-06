package com.meridian.rbac;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CapabilityRepository extends JpaRepository<Capability, Long> {

    Optional<Capability> findByName(String name);
}
