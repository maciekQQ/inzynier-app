package pl.inzynier.api.revision;

import java.time.Instant;
import java.util.List;

public record RevisionHistoryDto(
        Long revisionId,
        Instant createdAt,
        RevisionStatus status,
        String originalFileName,
        Long sizeBytes,
        String comment,
        String downloadUrl,
        List<RevisionGradeDto> grades,
        List<RevisionFeedbackMaterialDto> feedbackMaterials
) {
    public record RevisionGradeDto(Long gradeId, Long teacherId, Double pointsBrutto, Double pointsNetto, String comment, Instant createdAt, RevisionStatus statusAfterGrade) {
    }
    public record RevisionFeedbackMaterialDto(Long id, String originalFileName, String downloadUrl, Instant createdAt) {
    }
}






