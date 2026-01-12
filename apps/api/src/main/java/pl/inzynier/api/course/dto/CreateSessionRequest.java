package pl.inzynier.api.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import pl.inzynier.api.course.GradingMode;
import pl.inzynier.api.course.SessionType;

import java.time.Instant;
import java.util.List;

public record CreateSessionRequest(
        @NotNull Long courseId,
        @NotBlank String name,
        @NotNull SessionType type,
        @NotNull Integer tasksCount,
        @NotNull GradingMode gradingMode,
        Instant startDate,
        Instant endDate,
        List<TaskTemplateRequest> tasks
) {
}

