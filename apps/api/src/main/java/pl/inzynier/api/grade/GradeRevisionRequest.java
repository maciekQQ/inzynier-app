package pl.inzynier.api.grade;

import jakarta.validation.constraints.NotNull;
import pl.inzynier.api.revision.RevisionStatus;

public record GradeRevisionRequest(
        @NotNull Long revisionId,
        @NotNull Double points,
        String comment,
        @NotNull RevisionStatus statusAfterGrade,
        Boolean skipPenalty
) {
}






