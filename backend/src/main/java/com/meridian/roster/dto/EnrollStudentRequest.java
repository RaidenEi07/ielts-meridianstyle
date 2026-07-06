package com.meridian.roster.dto;

import jakarta.validation.constraints.NotNull;

public record EnrollStudentRequest(@NotNull Long courseId) {
}
