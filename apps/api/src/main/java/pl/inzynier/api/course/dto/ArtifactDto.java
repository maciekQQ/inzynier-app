package pl.inzynier.api.course.dto;

import pl.inzynier.api.course.Artifact;
import pl.inzynier.api.course.ArtifactType;

public record ArtifactDto(
        Long id,
        Long stageId,
        String name,
        ArtifactType type,
        Long maxSizeBytes,
        String allowedExtensionsCsv
) {
    public static ArtifactDto fromEntity(Artifact artifact) {
        return new ArtifactDto(
                artifact.getId(),
                artifact.getStage().getId(),
                artifact.getName(),
                artifact.getType(),
                artifact.getMaxSizeBytes(),
                artifact.getAllowedExtensionsCsv()
        );
    }
}


