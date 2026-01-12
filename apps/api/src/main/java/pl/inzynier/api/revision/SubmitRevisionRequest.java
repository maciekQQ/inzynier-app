package pl.inzynier.api.revision;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SubmitRevisionRequest(
        @NotNull Long artifactId,
        @NotBlank String fileKey,
        @NotBlank String originalFileName,
        String mimeType,
        Long sizeBytes,
        String comment
) {
}






