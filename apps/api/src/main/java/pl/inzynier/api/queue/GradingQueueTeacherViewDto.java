package pl.inzynier.api.queue;

import pl.inzynier.api.revision.RevisionStatus;

import java.time.Instant;

public record GradingQueueTeacherViewDto(
        Long artifactId,
        Long stageId,
        Long taskId,
        Long courseId,
        Long studentId,
        String albumNumber,
        String studentName,
        String taskTitle,
        String stageName,
        String artifactName,
        Long lastRevisionId,
        RevisionStatus lastRevisionStatus,
        Instant lastSubmittedAt,
        Instant softDeadline,
        Instant hardDeadline,
        Double penaltyPercentApplied,
        Double lastPointsBrutto,
        Double lastPointsNetto
) {
}

