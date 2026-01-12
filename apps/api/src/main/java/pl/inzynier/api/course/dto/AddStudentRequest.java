package pl.inzynier.api.course.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddStudentRequest(
        @NotBlank(message = "Email jest wymagany")
        @Email(message = "Nieprawidłowy format email")
        String email,
        
        @NotBlank(message = "Imię jest wymagane")
        String firstName,
        
        @NotBlank(message = "Nazwisko jest wymagane")
        String lastName,
        
        String albumNumber,
        String groupName
) {
}

