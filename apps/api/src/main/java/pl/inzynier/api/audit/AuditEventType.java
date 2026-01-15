package pl.inzynier.api.audit;

/**
 * Typy zdarzeń audytowych używane w aplikacji.
 */
public enum AuditEventType {
    STAGE_DEADLINES_CHANGED,
    GRADE_CANCELLED,
    GRADES_EXPORTED,
    STUDENTS_IMPORTED,
    TASK_CREATED,
    STAGE_CREATED,
    STAGE_UPDATED,
    ARTIFACT_CREATED,
    ARTIFACT_UPDATED,
    CSV_EXPORT_DETAILED,
    CSV_EXPORT_AGGREGATED,
    COURSE_ARCHIVED,
    REVISION_GRADED
}

