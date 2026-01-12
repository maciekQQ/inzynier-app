package pl.inzynier.api.course.dto;

import org.hibernate.Hibernate;
import pl.inzynier.api.course.Task;
import pl.inzynier.api.course.GradingMode;

public record TaskDto(
        Long id,
        Long courseId,
        String title,
        String description,
        java.time.Instant startDate,
        java.time.Instant endDate,
        Long teacherId,
        Long sessionId,
        String sessionName,
        GradingMode gradingMode,
        Double maxPoints,
        Double passThreshold
) {
    public static TaskDto fromEntity(Task task) {
        var session = task.getSession();
        Long sessionId = session != null ? session.getId() : null;
        String sessionName = (session != null && Hibernate.isInitialized(session)) ? session.getName() : null;
        return new TaskDto(
                task.getId(),
                task.getCourse().getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStartDate(),
                task.getEndDate(),
                task.getTeacherId(),
                sessionId,
                sessionName,
                task.getGradingMode(),
                task.getMaxPoints(),
                task.getPassThreshold()
        );
    }
}


