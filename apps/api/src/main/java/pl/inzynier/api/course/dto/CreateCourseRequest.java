package pl.inzynier.api.course.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCourseRequest(
        @NotBlank(message = "Nazwa kursu jest wymagana")
        String name
) {
}

