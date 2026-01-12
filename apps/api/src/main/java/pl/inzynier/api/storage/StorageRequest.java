package pl.inzynier.api.storage;

import jakarta.validation.constraints.NotBlank;

public record StorageRequest(
        @NotBlank String originalFileName,
        @NotBlank String prefix
) {
}






