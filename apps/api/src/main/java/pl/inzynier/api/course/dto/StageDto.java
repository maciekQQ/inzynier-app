package pl.inzynier.api.course.dto;

import pl.inzynier.api.course.Stage;

import java.time.Instant;

public record StageDto(
        Long id,
        Long taskId,
        String name,
        int weightPercent,
        Instant softDeadline,
        Instant hardDeadline,
        Double penaltyKPercentPer24h,
        Double penaltyMaxMPercent
) {
    public static StageDto fromEntity(Stage stage) {
        return new StageDto(
                stage.getId(),
                stage.getTask().getId(),
                stage.getName(),
                stage.getWeightPercent(),
                stage.getSoftDeadline(),
                stage.getHardDeadline(),
                stage.getPenaltyKPercentPer24h(),
                stage.getPenaltyMaxMPercent()
        );
    }
}


