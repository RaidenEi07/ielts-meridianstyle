package com.meridian.portal;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeacherProfileRepository extends JpaRepository<TeacherProfile, Long> {

    List<TeacherProfile> findByFeaturedTrueOrderBySortOrderAscIdAsc();
}
