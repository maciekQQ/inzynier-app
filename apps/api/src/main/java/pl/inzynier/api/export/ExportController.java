package pl.inzynier.api.export;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.course.*;
import pl.inzynier.api.grading.AggregationService;
import pl.inzynier.api.queue.GradingQueueEntry;
import pl.inzynier.api.queue.GradingQueueRepository;
import pl.inzynier.api.revision.RevisionStatus;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/export")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
public class ExportController {

    private final TaskRepository taskRepository;
    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;
    private final GradingQueueRepository gradingQueueRepository;
    private final CourseRepository courseRepository;
    private final CourseStudentRepository courseStudentRepository;
    private final AggregationService aggregationService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ExportController(TaskRepository taskRepository,
                            StageRepository stageRepository,
                            ArtifactRepository artifactRepository,
                            GradingQueueRepository gradingQueueRepository,
                            CourseRepository courseRepository,
                            CourseStudentRepository courseStudentRepository,
                            AggregationService aggregationService,
                            UserRepository userRepository,
                            AuditService auditService) {
        this.taskRepository = taskRepository;
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
        this.gradingQueueRepository = gradingQueueRepository;
        this.courseRepository = courseRepository;
        this.courseStudentRepository = courseStudentRepository;
        this.aggregationService = aggregationService;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    /**
     * Eksport szczegółowy (per artefakt) - wszystkie statusy.
     */
    @GetMapping("/course/{courseId}/csv-detailed")
    public ResponseEntity<byte[]> exportCourseDetailed(@PathVariable Long courseId) {
        List<Task> tasks = taskRepository.findByCourseId(courseId);
        StringBuilder sb = new StringBuilder();
        sb.append("taskId,taskTitle,stageId,stageName,stageWeight,artifactId,artifactName,");
        sb.append("studentId,albumNumber,studentName,status,pointsBrutto,pointsNetto,penalty%,lastSubmittedAt,");
        sb.append("softDeadline,hardDeadline\n");
        
        for (Task task : tasks) {
            List<Stage> stages = stageRepository.findByTaskId(task.getId());
            for (Stage stage : stages) {
                List<Artifact> artifacts = artifactRepository.findByStageId(stage.getId());
                for (Artifact artifact : artifacts) {
                    List<GradingQueueEntry> entries = gradingQueueRepository.findAll().stream()
                            .filter(e -> e.getId().getArtifactId().equals(artifact.getId()))
                            .toList();
                    for (GradingQueueEntry e : entries) {
                        sb.append(detailedRow(task, stage, artifact, e));
                    }
                }
            }
        }

        auditService.log("CSV_EXPORT_DETAILED", null, "{\"courseId\":" + courseId + "}");
        
        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=course_" + courseId + "_detailed.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    /**
     * Eksport z agregacją końcową - tylko studenci z conajmniej jedną zaakceptowaną rewizją.
     * Format: studentId,albumNumber,lastName,firstName,finalScore
     */
    @GetMapping("/course/{courseId}/csv-aggregated")
    public ResponseEntity<byte[]> exportCourseAggregated(@PathVariable Long courseId) {
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        
        List<Task> tasks = taskRepository.findByCourseId(courseId);
        List<ClassGroupStudent> enrollments = courseStudentRepository.findByCourseId(courseId);
        
        StringBuilder sb = new StringBuilder();
        sb.append("studentId,albumNumber,lastName,firstName,finalScore\n");

        for (ClassGroupStudent enrollment : enrollments) {
            Long studentId = enrollment.getStudentId();
            User student = userRepository.findById(studentId).orElse(null);
            if (student == null) continue;

            // Sprawdź, czy student ma jakąkolwiek zaakceptowaną rewizję
            boolean hasAccepted = gradingQueueRepository.findAll().stream()
                    .anyMatch(e -> e.getId().getStudentId().equals(studentId) 
                            && e.getCourseId().equals(courseId)
                            && RevisionStatus.ACCEPTED.equals(e.getLastRevisionStatus()));

            if (!hasAccepted) {
                continue; // Pomijamy studentów bez zaakceptowanych prac
            }

            // Agregacja dla wszystkich zadań
            double totalScore = 0.0;
            for (Task task : tasks) {
                AggregationService.AggregationResult result = aggregationService.aggregateTaskForStudent(task, studentId);
                totalScore += result.points();
            }

            sb.append(String.join(",",
                    safe(studentId),
                    safe(enrollment.getAlbumNumber()),
                    safe(student.getLastName()),
                    safe(student.getFirstName()),
                    String.format("%.2f", totalScore)
            )).append("\n");
        }

        auditService.log("CSV_EXPORT_AGGREGATED", null, "{\"courseId\":" + courseId + "}");

        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=course_" + courseId + "_final_grades.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    private String detailedRow(Task task, Stage stage, Artifact artifact, GradingQueueEntry e) {
        return String.join(",",
                safe(task.getId()),
                safe(task.getTitle()),
                safe(stage.getId()),
                safe(stage.getName()),
                safe(stage.getWeightPercent()),
                safe(artifact.getId()),
                safe(artifact.getName()),
                safe(e.getId().getStudentId()),
                safe(e.getAlbumNumber()),
                safe(e.getStudentName()),
                safe(e.getLastRevisionStatus()),
                safe(e.getLastPointsBrutto()),
                safe(e.getLastPointsNetto()),
                safe(e.getPenaltyPercentApplied()),
                safe(e.getLastSubmittedAt()),
                safe(e.getSoftDeadline()),
                safe(e.getHardDeadline())
        ) + "\n";
    }

    private String safe(Object o) {
        if (o == null) return "";
        String s = o.toString();
        // Escape CSV special chars
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
