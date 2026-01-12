package pl.inzynier.api.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import pl.inzynier.api.course.ArtifactType;

public record CreateArtifactRequest(
        @NotNull Long stageId,
        @NotBlank String name,
        ArtifactType type,
        Long maxSizeBytes,
        String allowedExtensionsCsv
) {
}






