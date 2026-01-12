package pl.inzynier.api.student.dto;

public record ChangePasswordRequest(String oldPassword, String newPassword) {
}

