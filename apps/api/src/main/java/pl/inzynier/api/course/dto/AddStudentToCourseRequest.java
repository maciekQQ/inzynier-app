package pl.inzynier.api.course.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddStudentToCourseRequest(
        @NotBlank String albumNumber,
        @NotBlank String firstName,
        @NotBlank String lastName,
        String groupName,
        @Email @NotBlank String email
) {}


