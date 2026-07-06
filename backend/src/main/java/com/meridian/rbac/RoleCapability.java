package com.meridian.rbac;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Ánh xạ role -> capability với cờ ALLOW/PREVENT.
 */
@Entity
@Table(name = "role_capabilities")
@Getter
@Setter
@NoArgsConstructor
public class RoleCapability {

    @EmbeddedId
    private RoleCapabilityId id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Permission permission = Permission.ALLOW;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    public static class RoleCapabilityId implements Serializable {

        @Column(name = "role_id")
        private Long roleId;

        @Column(name = "capability_id")
        private Long capabilityId;

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof RoleCapabilityId that)) {
                return false;
            }
            return Objects.equals(roleId, that.roleId)
                    && Objects.equals(capabilityId, that.capabilityId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(roleId, capabilityId);
        }
    }
}
