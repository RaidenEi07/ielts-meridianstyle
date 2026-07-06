package com.meridian.rbac;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContextRepository extends JpaRepository<Context, Long> {

    Optional<Context> findByTypeAndInstanceId(ContextType type, Long instanceId);

    default Optional<Context> findSystemContext() {
        return findByTypeAndInstanceId(ContextType.SYSTEM, 0L);
    }
}
