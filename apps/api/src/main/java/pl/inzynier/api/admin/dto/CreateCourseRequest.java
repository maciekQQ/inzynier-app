package pl.inzynier.api.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCourseRequest(@NotBlank String name) {
}






