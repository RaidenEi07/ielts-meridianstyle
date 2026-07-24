package com.meridian.distribution;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChildSiteRepository extends JpaRepository<ChildSite, Long> {

    java.util.List<ChildSite> findAllByOrderByNameAsc();
}
