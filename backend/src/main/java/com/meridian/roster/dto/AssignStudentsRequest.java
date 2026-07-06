package com.meridian.roster.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record AssignStudentsRequest(
        @NotNull UUID teacherId,
        @NotEmpty List<UUID> studentIds) {
}
