package pl.inzynier.api.export;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pl.inzynier.api.audit.AuditLog;
import pl.inzynier.api.audit.AuditLogRepository;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.course.*;
import pl.inzynier.api.queue.GradingQueueEntry;
import pl.inzynier.api.queue.GradingQueueRepository;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/archive")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
public class ArchiveController {

    private final CourseRepository courseRepository;
    private final TaskRepository taskRepository;
    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;
    private final CourseStudentRepository courseStudentRepository;
    private final GradingQueueRepository queueRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ArchiveController(CourseRepository courseRepository,
                             TaskRepository taskRepository,
                             StageRepository stageRepository,
                             ArtifactRepository artifactRepository,
                             CourseStudentRepository courseStudentRepository,
                             GradingQueueRepository queueRepository,
                             AuditLogRepository auditLogRepository,
                             UserRepository userRepository,
                             AuditService auditService) {
        this.courseRepository = courseRepository;
        this.taskRepository = taskRepository;
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
        this.courseStudentRepository = courseStudentRepository;
        this.queueRepository = queueRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.findAndRegisterModules(); // dla Instant
    }

    @PostMapping("/course/{courseId}")
    public ResponseEntity<byte[]> archiveCourse(
            @PathVariable Long courseId,
            @RequestParam(name = "anonymize", defaultValue = "false") boolean anonymize) throws IOException {
        
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));

        // Mapowanie anonimizacji: studentId -> Student_001, Student_002, ...
        Map<Long, String> anonymizationMap = new HashMap<>();
        if (anonymize) {
            List<ClassGroupStudent> students = courseStudentRepository.findByCourseId(courseId);
            int counter = 1;
            for (ClassGroupStudent cs : students) {
                anonymizationMap.put(cs.getStudentId(), String.format("Student_%03d", counter++));
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            
            // 1. metadata.json
            zos.putNextEntry(new ZipEntry("metadata.json"));
            Map<String, Object> metadata = Map.of(
                    "courseId", course.getId(),
                    "courseName", course.getName(),
                    "exportedAt", Instant.now().toString(),
                    "anonymized", anonymize
            );
            zos.write(objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(metadata).getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 2. structure.json (pełna struktura kursu)
            zos.putNextEntry(new ZipEntry("structure.json"));
            Map<String, Object> structure = buildStructure(courseId);
            zos.write(objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(structure).getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 3. grades_detailed.csv (wszystkie oceny per artefakt)
            zos.putNextEntry(new ZipEntry("grades_detailed.csv"));
            String detailedCsv = buildDetailedGradesCsv(courseId, anonymize, anonymizationMap);
            zos.write(detailedCsv.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 4. grading_queue.csv (read-model snapshot)
            zos.putNextEntry(new ZipEntry("grading_queue.csv"));
            String queueCsv = buildQueueCsv(courseId, anonymize, anonymizationMap);
            zos.write(queueCsv.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 5. audit_log.json (dziennik audytu)
            zos.putNextEntry(new ZipEntry("audit_log.json"));
            List<Map<String, Object>> auditLogs = buildAuditLog(courseId, anonymize, anonymizationMap);
            zos.write(objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(auditLogs).getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 6. students.csv (lista studentów)
            zos.putNextEntry(new ZipEntry("students.csv"));
            String studentsCsv = buildStudentsCsv(courseId, anonymize, anonymizationMap);
            zos.write(studentsCsv.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }

        auditService.log("COURSE_ARCHIVED", null, 
            String.format("{\"courseId\":%d,\"anonymized\":%b}", courseId, anonymize));

        byte[] zipBytes = baos.toByteArray();
        String filename = String.format("course_%d_archive_%s.zip", 
                courseId, 
                anonymize ? "anonymized" : "full");
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(zipBytes);
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<byte[]> archiveCourseGet(@PathVariable Long courseId,
                                                   @RequestParam(name = "anonymize", defaultValue = "false") boolean anonymize) throws IOException {
        return archiveCourse(courseId, anonymize);
    }

    private Map<String, Object> buildStructure(Long courseId) {
        List<Task> tasks = taskRepository.findByCourseId(courseId);
        List<Map<String, Object>> taskStructures = new ArrayList<>();

        for (Task task : tasks) {
            List<Stage> stages = stageRepository.findByTaskId(task.getId());
            List<Map<String, Object>> stageStructures = new ArrayList<>();

            for (Stage stage : stages) {
                List<Artifact> artifacts = artifactRepository.findByStageId(stage.getId());
                List<Map<String, Object>> artifactStructures = new ArrayList<>();

                for (Artifact artifact : artifacts) {
                    artifactStructures.add(Map.of(
                            "id", artifact.getId(),
                            "name", artifact.getName(),
                            "type", artifact.getType() != null ? artifact.getType() : "",
                            "maxSizeBytes", artifact.getMaxSizeBytes() != null ? artifact.getMaxSizeBytes() : 0
                    ));
                }

                stageStructures.add(Map.of(
                        "id", stage.getId(),
                        "name", stage.getName(),
                        "weightPercent", stage.getWeightPercent(),
                        "softDeadline", stage.getSoftDeadline() != null ? stage.getSoftDeadline().toString() : "",
                        "hardDeadline", stage.getHardDeadline() != null ? stage.getHardDeadline().toString() : "",
                        "penaltyKPercentPer24h", stage.getPenaltyKPercentPer24h() != null ? stage.getPenaltyKPercentPer24h() : 0.0,
                        "penaltyMaxMPercent", stage.getPenaltyMaxMPercent() != null ? stage.getPenaltyMaxMPercent() : 0.0,
                        "artifacts", artifactStructures
                ));
            }

            taskStructures.add(Map.of(
                    "id", task.getId(),
                    "title", task.getTitle(),
                    "description", task.getDescription() != null ? task.getDescription() : "",
                    "stages", stageStructures
            ));
        }

        return Map.of("tasks", taskStructures);
    }

    private String buildDetailedGradesCsv(Long courseId, boolean anonymize, Map<Long, String> anonMap) {
        List<GradingQueueEntry> entries = queueRepository.findByCourseId(courseId);
        StringBuilder sb = new StringBuilder();
        sb.append("studentId,albumNumber,studentName,taskId,stageId,artifactId,status,pointsBrutto,pointsNetto,penalty%,submittedAt\n");

        for (GradingQueueEntry e : entries) {
            String studentId = anonymize ? anonMap.getOrDefault(e.getId().getStudentId(), "Unknown") : e.getId().getStudentId().toString();
            String albumNumber = anonymize ? "" : (e.getAlbumNumber() != null ? e.getAlbumNumber() : "");
            String studentName = anonymize ? anonMap.getOrDefault(e.getId().getStudentId(), "Unknown") : (e.getStudentName() != null ? e.getStudentName() : "");

            sb.append(String.join(",",
                    studentId,
                    albumNumber,
                    studentName,
                    safe(e.getTaskId()),
                    safe(e.getStageId()),
                    safe(e.getId().getArtifactId()),
                    safe(e.getLastRevisionStatus()),
                    safe(e.getLastPointsBrutto()),
                    safe(e.getLastPointsNetto()),
                    safe(e.getPenaltyPercentApplied()),
                    safe(e.getLastSubmittedAt())
            )).append("\n");
        }

        return sb.toString();
    }

    private String buildQueueCsv(Long courseId, boolean anonymize, Map<Long, String> anonMap) {
        return buildDetailedGradesCsv(courseId, anonymize, anonMap); // identyczne
    }

    private List<Map<String, Object>> buildAuditLog(Long courseId, boolean anonymize, Map<Long, String> anonMap) {
        List<AuditLog> logs = auditLogRepository.findAll().stream()
                .filter(log -> log.getContextJson().contains("\"courseId\":" + courseId))
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (AuditLog log : logs) {
            String contextJson = log.getContextJson();
            if (anonymize) {
                // Anonimizuj studentId w kontekście
                for (Map.Entry<Long, String> entry : anonMap.entrySet()) {
                    contextJson = contextJson.replaceAll("\"studentId\":" + entry.getKey(), "\"studentId\":\"" + entry.getValue() + "\"");
                }
            }

            result.add(Map.of(
                    "id", log.getId(),
                    "eventType", log.getEventType(),
                    "occurredAt", log.getOccurredAt().toString(),
                    "actorId", log.getActorId() != null ? log.getActorId() : 0,
                    "context", contextJson
            ));
        }

        return result;
    }

    private String buildStudentsCsv(Long courseId, boolean anonymize, Map<Long, String> anonMap) {
        List<ClassGroupStudent> students = courseStudentRepository.findByCourseId(courseId);
        StringBuilder sb = new StringBuilder();
        sb.append("studentId,albumNumber,firstName,lastName,groupName\n");

        for (ClassGroupStudent cs : students) {
            User user = userRepository.findById(cs.getStudentId()).orElse(null);
            if (user == null) continue;

            String studentId = anonymize ? anonMap.getOrDefault(cs.getStudentId(), "Unknown") : cs.getStudentId().toString();
            String albumNumber = anonymize ? "" : (cs.getAlbumNumber() != null ? cs.getAlbumNumber() : "");
            String firstName = anonymize ? anonMap.getOrDefault(cs.getStudentId(), "Unknown").split("_")[0] : user.getFirstName();
            String lastName = anonymize ? "" : user.getLastName();
            String groupName = anonymize ? "" : (cs.getGroupName() != null ? cs.getGroupName() : "");

            sb.append(String.join(",", studentId, albumNumber, firstName, lastName, groupName)).append("\n");
        }

        return sb.toString();
    }

    private String safe(Object o) {
        if (o == null) return "";
        String s = o.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
