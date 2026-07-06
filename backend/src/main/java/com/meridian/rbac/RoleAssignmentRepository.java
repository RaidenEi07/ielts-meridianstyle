package com.meridian.rbac;

import com.meridian.user.User;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoleAssignmentRepository extends JpaRepository<RoleAssignment, Long> {

    List<RoleAssignment> findByUserId(UUID userId);

    boolean existsByUserAndRoleAndContext(User user, Role role, Context context);

    /**
     * Trả về tất cả grant (capability + ALLOW/PREVENT) cho user trong tập context cho trước
     * (thường là chuỗi từ context đích lên tới SYSTEM). Việc resolve theo độ ưu tiên
     * context được thực hiện ở tầng service.
     */
    @Query("""
            SELECT ra.context.id AS contextId,
                   cap.name       AS capabilityName,
                   rc.permission  AS permission
            FROM RoleAssignment ra
            JOIN RoleCapability rc ON rc.id.roleId = ra.role.id
            JOIN Capability cap    ON cap.id = rc.id.capabilityId
            WHERE ra.user.id = :userId
              AND ra.context.id IN :contextIds
            """)
    List<CapabilityGrant> findGrantsForUserInContexts(
            @Param("userId") UUID userId,
            @Param("contextIds") Collection<Long> contextIds);
}
