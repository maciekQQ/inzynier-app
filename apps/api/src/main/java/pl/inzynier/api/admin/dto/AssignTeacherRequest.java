package pl.inzynier.api.admin.dto;

import jakarta.validation.constraints.NotNull;

public record AssignTeacherRequest(@NotNull Long teacherId) {
}






