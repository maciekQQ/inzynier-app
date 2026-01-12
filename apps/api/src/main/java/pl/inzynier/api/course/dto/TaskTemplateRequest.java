package pl.inzynier.api.course.dto;

import java.time.Instant;
import pl.inzynier.api.course.GradingMode;

public record TaskTemplateRequest(
        String title,
        String description,
        Instant startDate,
        Instant endDate,
        GradingMode gradingMode,
        Double maxPoints,
        Double passThreshold,
        String materialFileKey,
        String materialOriginalFileName
) {
}

