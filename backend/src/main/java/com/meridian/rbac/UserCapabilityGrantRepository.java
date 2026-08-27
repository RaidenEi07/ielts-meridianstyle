package com.meridian.rbac;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserCapabilityGrantRepository extends JpaRepository<UserCapabilityGrant, Long> {

    /**
     * Trả về tất cả grant LẺ (capability + ALLOW/PREVENT) cho user trong tập
     * context cho trước — cùng shape {@link CapabilityGrant} với
     * {@link RoleAssignmentRepository#findGrantsForUserInContexts}, để
     * PermissionService gộp 2 nguồn lại resolve chung 1 lượt.
     */
    @Query("""
            SELECT g.context.id  AS contextId,
                   cap.name      AS capabilityName,
                   g.permission  AS permission
            FROM UserCapabilityGrant g
            JOIN Capability cap ON cap.id = g.capability.id
            WHERE g.user.id = :userId
              AND g.context.id IN :contextIds
            """)
    List<CapabilityGrant> findGrantsForUserInContexts(
            @Param("userId") UUID userId,
            @Param("contextIds") Collection<Long> contextIds);

    /** Toàn bộ quyền lẻ của 1 user, xuyên suốt mọi context — dùng cho màn
     * quản trị "Quyền theo khóa học" (nhóm lại theo context ở tầng service). */
    List<UserCapabilityGrant> findByUserId(UUID userId);

    List<UserCapabilityGrant> findByUserIdAndContextId(UUID userId, Long contextId);

    /**
     * Xóa NGAY LẬP TỨC bằng 1 câu DELETE thẳng qua @Modifying, không đi qua
     * persistence context như derived {@code deleteByX} mặc định (vốn nạp
     * từng entity rồi entityManager.remove() — hành động REMOVE đó bị hoãn
     * lại chờ flush CÙNG ĐỢT với các INSERT gọi sau trong RbacService.
     * setCourseGrants(), và Hibernate mặc định flush INSERT trước DELETE
     * trong cùng 1 lượt flush). Thiếu @Modifying ở đây từng gây lỗi thật:
     * sửa 1 grant còn giữ lại capability cũ (vd grade:view) thì INSERT dòng
     * (user, grade:view, context) mới chạy trước khi dòng CŨ bị xóa thật sự
     * dưới DB, vi phạm unique constraint (user_id, capability_id,
     * context_id) → 500 ngay khi Sửa mà không đổi hết toàn bộ tick.
     */
    @Modifying
    @Query("DELETE FROM UserCapabilityGrant g WHERE g.user.id = :userId AND g.context.id = :contextId")
    void deleteByUserIdAndContextId(@Param("userId") UUID userId, @Param("contextId") Long contextId);
}
