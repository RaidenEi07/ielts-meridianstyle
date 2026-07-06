package com.meridian.rbac;

import com.meridian.common.ApiException;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phân giải quyền hiệu lực của một user tại một context, có kế thừa theo cây
 * (System -> Category -> Course -> Quiz) và hỗ trợ override bằng PREVENT.
 *
 * Quy tắc: với mỗi capability, grant tại context CỤ THỂ nhất thắng. Ở cùng một
 * mức context, PREVENT thắng ALLOW.
 */
@Service
public class PermissionService {

    private final ContextService contextService;
    private final RoleAssignmentRepository roleAssignmentRepository;

    public PermissionService(ContextService contextService,
            RoleAssignmentRepository roleAssignmentRepository) {
        this.contextService = contextService;
        this.roleAssignmentRepository = roleAssignmentRepository;
    }

    /** Kiểm tra quyền tại một context cụ thể. */
    @Transactional(readOnly = true)
    public boolean hasCapability(UUID userId, String capability, Long contextId) {
        return getEffectiveCapabilities(userId, contextId).contains(capability);
    }

    /** Kiểm tra quyền tại SYSTEM context. */
    @Transactional(readOnly = true)
    public boolean hasSystemCapability(UUID userId, String capability) {
        Long systemContextId = contextService.requireSystemContext().getId();
        return hasCapability(userId, capability, systemContextId);
    }

    /** Như {@link #hasCapability} nhưng ném 403 nếu thiếu quyền. */
    @Transactional(readOnly = true)
    public void requireCapability(UUID userId, String capability, Long contextId) {
        if (!hasCapability(userId, capability, contextId)) {
            throw ApiException.forbidden("Thiếu quyền '" + capability + "'");
        }
    }

    @Transactional(readOnly = true)
    public void requireSystemCapability(UUID userId, String capability) {
        if (!hasSystemCapability(userId, capability)) {
            throw ApiException.forbidden("Thiếu quyền '" + capability + "'");
        }
    }

    /**
     * Tập capability có hiệu lực (đã giải kế thừa + override) của user tại context.
     */
    @Transactional(readOnly = true)
    public Set<String> getEffectiveCapabilities(UUID userId, Long contextId) {
        List<Long> chain = contextService.getInheritanceChainIds(contextId);

        // depth: index trong chain (0 = cụ thể nhất)
        Map<Long, Integer> depthOf = new HashMap<>();
        for (int i = 0; i < chain.size(); i++) {
            depthOf.put(chain.get(i), i);
        }

        List<CapabilityGrant> grants =
                roleAssignmentRepository.findGrantsForUserInContexts(userId, chain);

        // Với mỗi capability giữ lại quyết định tại context cụ thể nhất.
        // PREVENT tại cùng mức thắng ALLOW.
        Map<String, Decision> decisionOf = new HashMap<>();
        for (CapabilityGrant grant : grants) {
            int depth = depthOf.getOrDefault(grant.getContextId(), Integer.MAX_VALUE);
            Decision existing = decisionOf.get(grant.getCapabilityName());
            if (existing == null || depth < existing.depth
                    || (depth == existing.depth
                        && grant.getPermission() == Permission.PREVENT)) {
                decisionOf.put(grant.getCapabilityName(),
                        new Decision(depth, grant.getPermission()));
            }
        }

        Set<String> effective = new LinkedHashSet<>();
        decisionOf.forEach((cap, decision) -> {
            if (decision.permission == Permission.ALLOW) {
                effective.add(cap);
            }
        });
        return effective;
    }

    private record Decision(int depth, Permission permission) {
    }
}
