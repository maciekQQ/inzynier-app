package pl.inzynier.api.course.dto;

public record TaskMaterialDto(
        Long id,
        Long taskId,
        String fileKey,
        String originalFileName,
        String downloadUrl
) {
}

