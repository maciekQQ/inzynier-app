package pl.inzynier.api.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import pl.inzynier.api.course.GradingMode;
import java.time.Instant;

public record CreateTaskRequest(
        @NotNull Long courseId,
        @NotBlank String title,
        String description,
        @NotNull Instant startDate,
        @NotNull Instant endDate,
        Long sessionId,
        GradingMode gradingMode,
        Double maxPoints,
        Double passThreshold
) {
}






