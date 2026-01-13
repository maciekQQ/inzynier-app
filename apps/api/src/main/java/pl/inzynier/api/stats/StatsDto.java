package pl.inzynier.api.stats;

public record StatsDto(
        Long taskId,
        String taskTitle,
        Long courseId,
        String courseName,
        int passed,
        int failed,
        int pending
) {}

