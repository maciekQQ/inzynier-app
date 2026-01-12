package pl.inzynier.api.course;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record StageExemptionRequest(
        @NotNull Long stageId,
        @NotNull Long studentId,
        @NotNull Long teacherId,
        boolean allowAfterHard,
        Instant customSoft,
        Instant customHard,
        String reason
) {
}






