package pl.inzynier.api.course.dto;

import pl.inzynier.api.revision.RevisionStatus;

import java.time.Instant;

/**
 * DTO dla widoku studenta - tabela z zadaniami, etapami, terminami i statusami.
 */
public record StudentTaskViewDto(
        Long taskId,
        String taskTitle,
        String taskDescription,
        Long sessionId,
        String sessionName,
        Long stageId,
        String stageName,
        int stageWeightPercent,
        Instant softDeadline,
        Instant hardDeadline,
        Long artifactId,
        String artifactName,
        String gradingMode,
        RevisionStatus lastRevisionStatus,
        Instant lastSubmittedAt,
        Double lastPointsNetto,
        Integer daysUntilSoft,
        Integer daysOverdue,
        String statusLabel,
        java.util.List<TaskMaterialDto> materials,
        Double maxPoints,
        Double passThreshold
) {
    public static String computeStatusLabel(RevisionStatus status, Integer daysUntilSoft, Integer daysOverdue) {
        if (status == null) {
            return "Nie oddano";
        }
        switch (status) {
            case SUBMITTED:
                return "Oczekuje na ocenę";
            case NEEDS_FIX:
                return "Wymaga poprawy";
            case ACCEPTED:
                return "Zaakceptowano";
            case REJECTED:
                return "Odrzucono";
            default:
                return "Nieznany";
        }
    }
}

