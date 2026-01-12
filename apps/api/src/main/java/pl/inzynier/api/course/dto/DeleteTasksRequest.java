package pl.inzynier.api.course.dto;

import java.util.List;

public record DeleteTasksRequest(
        Long courseId,
        List<Long> taskIds
) {
}

