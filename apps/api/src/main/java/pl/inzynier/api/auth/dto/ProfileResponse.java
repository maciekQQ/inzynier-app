package pl.inzynier.api.auth.dto;

import pl.inzynier.api.user.UserRole;

public record ProfileResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        UserRole role
) {
}







