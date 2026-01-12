package pl.inzynier.api.course.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record CreateStageRequest(
        @NotNull Long taskId,
        @NotBlank String name,
        @Min(0) @Max(100) int weightPercent,
        Instant softDeadline,
        Instant hardDeadline,
        Double penaltyKPercentPer24h,
        Double penaltyMaxMPercent
) {
}






