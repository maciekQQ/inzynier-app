package pl.inzynier.api.course;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.audit.AuditEventType;
import pl.inzynier.api.course.dto.*;
import pl.inzynier.api.storage.StorageService;
import pl.inzynier.api.revision.RevisionRepository;
import pl.inzynier.api.revision.RevisionFeedbackMaterialRepository;
import pl.inzynier.api.grade.GradeRepository;
import pl.inzynier.api.user.User;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.hibernate.Hibernate;

@RestController
@RequestMapping("/api/course")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEACHER')")
public class CourseStructureController {

    private final CourseRepository courseRepository;
    private final TaskRepository taskRepository;
    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;
    private final TaskWeightValidator weightValidator;
    private final StageValidator stageValidator;
    private final AuditService auditService;
    private final CourseTeacherRepository courseTeacherRepository;
    private final TaskMaterialRepository taskMaterialRepository;
    private final StageExemptionRepository stageExemptionRepository;
    private final StorageService storageService;
    private final SessionRepository sessionRepository;
    private final TaskStudentRepository taskStudentRepository;
    private final RevisionRepository revisionRepository;
    private final GradeRepository gradeRepository;
    private final RevisionFeedbackMaterialRepository revisionFeedbackMaterialRepository;

    public CourseStructureController(CourseRepository courseRepository,
                                     TaskRepository taskRepository,
                                     StageRepository stageRepository,
                                     ArtifactRepository artifactRepository,
                                     TaskWeightValidator weightValidator,
                                     StageValidator stageValidator,
                                     AuditService auditService,
                                     CourseTeacherRepository courseTeacherRepository,
                                     TaskMaterialRepository taskMaterialRepository,
                                     StorageService storageService,
                                     SessionRepository sessionRepository,
                                     TaskStudentRepository taskStudentRepository,
                                     StageExemptionRepository stageExemptionRepository,
                                     RevisionRepository revisionRepository,
                                     GradeRepository gradeRepository,
                                     RevisionFeedbackMaterialRepository revisionFeedbackMaterialRepository) {
        this.courseRepository = courseRepository;
        this.taskRepository = taskRepository;
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
        this.weightValidator = weightValidator;
        this.stageValidator = stageValidator;
        this.auditService = auditService;
        this.courseTeacherRepository = courseTeacherRepository;
        this.taskMaterialRepository = taskMaterialRepository;
        this.storageService = storageService;
        this.sessionRepository = sessionRepository;
        this.taskStudentRepository = taskStudentRepository;
        this.stageExemptionRepository = stageExemptionRepository;
        this.revisionRepository = revisionRepository;
        this.gradeRepository = gradeRepository;
        this.revisionFeedbackMaterialRepository = revisionFeedbackMaterialRepository;
    }
    
    /**
     * Sprawdza czy użytkownik ma dostęp do kursu (jest adminem lub przypisanym nauczycielem)
     */
    private void verifyAccessToCourse(Long courseId, pl.inzynier.api.user.User user) {
        if (user.getRole() == pl.inzynier.api.user.UserRole.ADMIN) {
            return; // Admin ma dostęp do wszystkich kursów
        }
        
        boolean hasAccess = courseTeacherRepository.findByTeacherId(user.getId()).stream()
                .anyMatch(ct -> ct.getClassGroup().getId().equals(courseId));
        
        if (!hasAccess) {
            throw new org.springframework.security.access.AccessDeniedException(
                "Nie masz dostępu do tego kursu");
        }
    }

    @PostMapping("/tasks")
    public ResponseEntity<?> createTask(@Valid @RequestBody CreateTaskRequest request,
                                               @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User user) {
        ClassGroup course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        
        // Weryfikacja dostępu
        verifyAccessToCourse(course.getId(), user);

        if (request.startDate().isAfter(request.endDate())) {
            throw new IllegalArgumentException("Data początkowa musi być przed datą końcową");
        }
        // Walidacja terminów etapu domyślnego (soft >= now, soft <= hard)
        try {
            stageValidator.validateDeadlines(request.startDate(), request.endDate());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
        
        Session session = null;
        if (request.sessionId() != null) {
            session = sessionRepository.findById(request.sessionId()).orElseThrow(() -> new IllegalArgumentException("Session not found"));
        }

        Double maxPoints = request.gradingMode() == pl.inzynier.api.course.GradingMode.POINTS10
                ? (request.maxPoints() != null ? request.maxPoints() : 10.0)
                : 100.0;

        Task task = new Task(
                course,
                session,
                request.title(),
                request.description(),
                request.startDate(),
                request.endDate(),
                user.getId(),
                request.gradingMode(),
                maxPoints,
                request.passThreshold()
        );
        Task saved = taskRepository.save(task);

        // Domyślny etap i artefakt, aby pojedyncze zadania były widoczne w kolejce/oddaniach
        Stage stage = new Stage(
                saved,
                "Etap 1",
                100,
                request.startDate(),
                request.endDate(),
                0.0,
                100.0
        );
        Stage savedStage = stageRepository.save(stage);
        artifactRepository.save(new Artifact(savedStage, "Plik do oddania", ArtifactType.OTHER, null, ""));
        
        auditService.log("TASK_CREATED", null,
            String.format("{\"courseId\":%d,\"taskId\":%d,\"title\":\"%s\"}", 
                course.getId(), saved.getId(), saved.getTitle()));
        
        return ResponseEntity.ok(TaskDto.fromEntity(saved));
    }

    @PostMapping("/stages")
    public ResponseEntity<?> createStage(@Valid @RequestBody CreateStageRequest request) {
        Task task = taskRepository.findById(request.taskId())
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        
        // Walidacja terminów
        try {
            stageValidator.validateDeadlines(request.softDeadline(), request.hardDeadline());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
        
        // Walidacja parametrów kar
        stageValidator.validatePenaltyParams(request.penaltyKPercentPer24h(), request.penaltyMaxMPercent());
        
        // Walidacja sumy wag (czy dodanie tego etapu nie przekroczy 100%)
        weightValidator.validateAddingStage(request.taskId(), request.weightPercent());
        
        Stage stage = new Stage(
                task,
                request.name(),
                request.weightPercent(),
                request.softDeadline(),
                request.hardDeadline(),
                request.penaltyKPercentPer24h(),
                request.penaltyMaxMPercent()
        );
        Stage saved = stageRepository.save(stage);
        
        // Audit log
        auditService.log("STAGE_CREATED", null, 
            String.format("{\"taskId\":%d,\"stageId\":%d,\"weight\":%d}", 
                task.getId(), saved.getId(), saved.getWeightPercent()));
        
        return ResponseEntity.ok(StageDto.fromEntity(saved));
    }

    @PutMapping("/stages/{stageId}")
    public ResponseEntity<?> updateStage(@PathVariable Long stageId,
                                                @Valid @RequestBody CreateStageRequest request,
                                                @AuthenticationPrincipal User user) {
        Stage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new IllegalArgumentException("Stage not found"));

        // Walidacja terminów i kar
        try {
            stageValidator.validateDeadlines(request.softDeadline(), request.hardDeadline());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
        stageValidator.validatePenaltyParams(request.penaltyKPercentPer24h(), request.penaltyMaxMPercent());

        // Walidacja sumy wag po zmianie (odjąć starą, dodać nową)
        weightValidator.validateTaskWeights(stage.getTask().getId()); // ensure base OK
        int currentTotal = stageRepository.findByTaskId(stage.getTask().getId()).stream()
                .filter(s -> !s.getId().equals(stageId))
                .mapToInt(Stage::getWeightPercent)
                .sum();
        if (currentTotal + request.weightPercent() > 100) {
            throw new IllegalStateException("Zmiana przekroczy 100% wag");
        }

        // Zapamiętaj stare wartości do audytu
        int oldWeight = stage.getWeightPercent();
        var oldSoft = stage.getSoftDeadline();
        var oldHard = stage.getHardDeadline();

        stage.update(
                request.name(),
                request.weightPercent(),
                request.softDeadline(),
                request.hardDeadline(),
                request.penaltyKPercentPer24h(),
                request.penaltyMaxMPercent()
        );
        Stage saved = stageRepository.save(stage);

        // Audyt zmian wag etapów
        if (oldWeight != saved.getWeightPercent()) {
            auditService.log(
                    AuditEventType.STAGE_WEIGHTS_CHANGED,
                    user != null ? user.getId() : null,
                    String.format(
                            "{\"taskId\":%d,\"stageId\":%d,\"oldWeight\":%d,\"newWeight\":%d,\"changedBy\":%s}",
                            saved.getTask().getId(),
                            saved.getId(),
                            oldWeight,
                            saved.getWeightPercent(),
                            user != null ? user.getId() : "null"
                    )
            );
        }

        // Audyt zmian terminów
        boolean deadlinesChanged = (oldSoft == null ? request.softDeadline() != null : !oldSoft.equals(request.softDeadline()))
                || (oldHard == null ? request.hardDeadline() != null : !oldHard.equals(request.hardDeadline()));
        if (deadlinesChanged) {
            auditService.log(
                    AuditEventType.STAGE_DEADLINES_CHANGED,
                    user != null ? user.getId() : null,
                    String.format(
                            "{\"stageId\":%d,\"oldSoftDeadline\":\"%s\",\"newSoftDeadline\":\"%s\",\"oldHardDeadline\":\"%s\",\"newHardDeadline\":\"%s\"}",
                            saved.getId(),
                            oldSoft,
                            request.softDeadline(),
                            oldHard,
                            request.hardDeadline()
                    )
            );
        }

        auditService.log("STAGE_UPDATED", null,
                String.format("{\"stageId\":%d,\"weight\":%d}", saved.getId(), saved.getWeightPercent()));

        return ResponseEntity.ok(StageDto.fromEntity(saved));
    }

    @PostMapping("/artifacts")
    public ResponseEntity<ArtifactDto> createArtifact(@Valid @RequestBody CreateArtifactRequest request) {
        Stage stage = stageRepository.findById(request.stageId())
                .orElseThrow(() -> new IllegalArgumentException("Stage not found"));
        if (request.maxSizeBytes() != null && request.maxSizeBytes() <= 0) {
            throw new IllegalArgumentException("maxSizeBytes musi być > 0");
        }
        Artifact artifact = new Artifact(
                stage,
                request.name(),
                request.type(),
                request.maxSizeBytes(),
                request.allowedExtensionsCsv()
        );
        Artifact saved = artifactRepository.save(artifact);
        
        auditService.log("ARTIFACT_CREATED", null,
            String.format("{\"stageId\":%d,\"artifactId\":%d,\"name\":\"%s\"}", 
                stage.getId(), saved.getId(), saved.getName()));
        
        return ResponseEntity.ok(ArtifactDto.fromEntity(saved));
    }

    @PutMapping("/artifacts/{artifactId}")
    public ResponseEntity<ArtifactDto> updateArtifact(@PathVariable Long artifactId,
                                                      @Valid @RequestBody UpdateArtifactRequest request) {
        Artifact artifact = artifactRepository.findById(artifactId)
                .orElseThrow(() -> new IllegalArgumentException("Artifact not found"));
        if (!artifact.getStage().getId().equals(request.stageId())) {
            throw new IllegalArgumentException("Artifact nie należy do podanego etapu");
        }
        if (request.maxSizeBytes() != null && request.maxSizeBytes() <= 0) {
            throw new IllegalArgumentException("maxSizeBytes musi być > 0");
        }
        Artifact saved = artifactRepository.save(new Artifact(
                artifact.getStage(),
                request.name(),
                request.type(),
                request.maxSizeBytes(),
                request.allowedExtensionsCsv()
        ));
        
        auditService.log("ARTIFACT_UPDATED", null,
            String.format("{\"artifactId\":%d,\"name\":\"%s\"}", 
                saved.getId(), saved.getName()));
        
        return ResponseEntity.ok(ArtifactDto.fromEntity(saved));
    }

    @GetMapping("/{courseId}/tasks")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<TaskDto> listTasks(@PathVariable Long courseId,
                                    @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User user) {
        // Weryfikacja dostępu
        verifyAccessToCourse(courseId, user);
        
        List<Task> list = taskRepository.findByCourseId(courseId);
        // Zainicjalizuj sesję, aby TaskDto mógł zwrócić sessionName
        list.forEach(t -> {
            if (t.getSession() != null) {
                Hibernate.initialize(t.getSession());
            }
        });
        return list.stream()
                .map(TaskDto::fromEntity)
                .toList();
    }

    /**
     * Usuwa wskazane zadania (kaskada w DB usuwa etapy/artefakty/rewizje/oceny).
     */
    @DeleteMapping("/tasks/bulk")
    @Transactional
    public ResponseEntity<?> deleteTasksBulk(@RequestBody DeleteTasksRequest request,
                                             @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User user) {
        if (request == null || request.taskIds() == null || request.taskIds().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Brak zadań do usunięcia"));
        }
        if (request.courseId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Brak courseId"));
        }
        ClassGroup course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));

        verifyAccessToCourse(course.getId(), user);

        List<Task> tasks = taskRepository.findAllById(request.taskIds());
        if (tasks.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nie znaleziono zadań"));
        }
        boolean anyForeign = tasks.stream().anyMatch(t -> !t.getCourse().getId().equals(course.getId()));
        if (anyForeign) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Zadanie nie należy do wybranego kursu"));
        }

        tasks.forEach(t -> taskStudentRepository.deleteAll(taskStudentRepository.findByTaskId(t.getId())));

        // usuwamy zależności: materiały zadania, oceny/rewizje/materiały feedback, artefakty/etapy, zwolnienia z etapu
        for (Task t : tasks) {
            taskMaterialRepository.deleteAll(taskMaterialRepository.findByTaskId(t.getId()));
            List<Stage> stages = stageRepository.findByTaskId(t.getId());
            for (Stage stage : stages) {
                stageExemptionRepository.deleteAll(stageExemptionRepository.findByStageId(stage.getId()));
                // usuń rewizje i powiązane zasoby dla wszystkich artefaktów etapu
                artifactRepository.findByStageId(stage.getId()).forEach(artifact -> {
                    var revisions = revisionRepository.findByArtifactId(artifact.getId());
                    revisions.forEach(rev -> {
                        gradeRepository.deleteAll(gradeRepository.findByRevisionId(rev.getId()));
                        revisionFeedbackMaterialRepository.deleteAll(revisionFeedbackMaterialRepository.findByRevisionIdOrderByCreatedAtDesc(rev.getId()));
                    });
                    revisionRepository.deleteAll(revisions);
                });
                artifactRepository.deleteAll(artifactRepository.findByStageId(stage.getId()));
            }
            stageRepository.deleteAll(stages);
        }

        taskRepository.deleteAll(tasks);

        auditService.log("TASKS_DELETED", user.getId(),
                String.format("{\"courseId\":%d,\"count\":%d}", course.getId(), tasks.size()));

        return ResponseEntity.ok(Map.of("status", "ok", "deleted", tasks.size()));
    }

    @GetMapping("/tasks/{taskId}/stages")
    public List<StageDto> listStages(@PathVariable Long taskId) {
        return stageRepository.findByTaskId(taskId).stream()
                .map(StageDto::fromEntity)
                .toList();
    }

    @GetMapping("/stages/{stageId}/artifacts")
    public List<ArtifactDto> listArtifacts(@PathVariable Long stageId) {
        return artifactRepository.findByStageId(stageId).stream()
                .map(ArtifactDto::fromEntity)
                .toList();
    }

    @PostMapping("/sessions")
    public ResponseEntity<Map<String, Object>> createSession(@Valid @RequestBody CreateSessionRequest request,
                                                             @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User user) {
        ClassGroup course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        verifyAccessToCourse(course.getId(), user);

        int tasksToCreate = (request.tasks() != null && !request.tasks().isEmpty())
                ? request.tasks().size()
                : request.tasksCount();

        Session session = sessionRepository.save(new Session(
                course,
                request.name(),
                request.type(),
                tasksToCreate,
                request.gradingMode()
        ));

        if (request.tasks() != null && !request.tasks().isEmpty()) {
            int idx = 1;
            for (var tdef : request.tasks()) {
                String title = (tdef.title() != null && !tdef.title().isBlank()) ? tdef.title() : request.name() + " - Zadanie " + idx;
                Double maxPoints = tdef.gradingMode() == pl.inzynier.api.course.GradingMode.POINTS10
                        ? (tdef.maxPoints() != null ? tdef.maxPoints() : 10.0)
                        : 100.0;
                Task task = new Task(
                        course,
                        session,
                        title,
                        tdef.description() == null ? "" : tdef.description(),
                        tdef.startDate(),
                        tdef.endDate(),
                        user.getId(),
                        tdef.gradingMode() == null ? request.gradingMode() : tdef.gradingMode(),
                        maxPoints,
                        tdef.passThreshold()
                );
                Task savedTask = taskRepository.save(task);

                Stage stage = new Stage(
                        savedTask,
                        "Etap 1",
                        100,
                        tdef.startDate(),
                        tdef.endDate(),
                        0.0,
                        100.0
                );
                Stage savedStage = stageRepository.save(stage);

                Artifact artifact = new Artifact(savedStage, "Plik do oddania", ArtifactType.OTHER, null, "");
                artifactRepository.save(artifact);

                if (tdef.materialFileKey() != null && !tdef.materialFileKey().isBlank()) {
                    taskMaterialRepository.save(new TaskMaterial(savedTask, tdef.materialFileKey(), tdef.materialOriginalFileName()));
                }
                idx++;
            }
        } else {
            for (int i = 1; i <= tasksToCreate; i++) {
                Double maxPoints = request.gradingMode() == pl.inzynier.api.course.GradingMode.POINTS10 ? 10.0 : 100.0;
                Task task = new Task(
                        course,
                        session,
                        request.name() + " - Zadanie " + i,
                        "",
                        request.startDate(),
                        request.endDate(),
                        user.getId(),
                        request.gradingMode(),
                        maxPoints,
                        null
                );
                Task savedTask = taskRepository.save(task);

                Stage stage = new Stage(
                        savedTask,
                        "Etap 1",
                        100,
                        request.startDate(),
                        request.endDate(),
                        0.0,
                        100.0
                );
                Stage savedStage = stageRepository.save(stage);

                Artifact artifact = new Artifact(savedStage, "Plik do oddania", ArtifactType.OTHER, null, "");
                artifactRepository.save(artifact);
            }
        }

        auditService.log("SESSION_CREATED", user.getId(),
                String.format("{\"courseId\":%d,\"sessionId\":%d,\"tasksCount\":%d}", course.getId(), session.getId(), request.tasksCount()));

        return ResponseEntity.ok(Map.of(
                "sessionId", session.getId(),
                "status", "created"
        ));
    }

    /**
     * Endpoint do sprawdzania statusu wag zadania.
     */
    @GetMapping("/tasks/{taskId}/weight-status")
    public ResponseEntity<Map<String, Object>> getWeightStatus(@PathVariable Long taskId) {
        TaskWeightValidator.WeightStatus status = weightValidator.getWeightStatus(taskId);
        return ResponseEntity.ok(Map.of(
            "currentTotal", status.currentTotal(),
            "remaining", status.remaining(),
            "stageCount", status.stageCount(),
            "isValid", status.currentTotal() == 100
        ));
    }

    /**
     * Endpoint do walidacji zadania (czy suma wag = 100%).
     */
    @PostMapping("/tasks/{taskId}/validate")
    public ResponseEntity<Map<String, Object>> validateTask(@PathVariable Long taskId) {
        try {
            weightValidator.validateTaskWeights(taskId);
            return ResponseEntity.ok(Map.of("valid", true, "message", "Zadanie jest poprawne (suma wag = 100%)"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", e.getMessage()));
        }
    }

    @PatchMapping("/tasks/{taskId}")
    public ResponseEntity<TaskDto> updateTask(@PathVariable Long taskId,
                                              @RequestBody UpdateTaskRequest request,
                                              @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User user) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new IllegalArgumentException("Task not found"));
        verifyAccessToCourse(task.getCourse().getId(), user);

        if (request.title() != null && !request.title().isBlank()) {
            task.setTitle(request.title());
        }
        if (request.description() != null) {
            task.setDescription(request.description());
        }
        if (request.startDate() != null || request.endDate() != null) {
            task.updateDates(request.startDate(), request.endDate());
        }
        if (request.gradingMode() != null) {
            task.setGradingMode(request.gradingMode());
        }
        if (request.maxPoints() != null) {
            task.setMaxPoints(request.maxPoints());
        }
        if (request.passThreshold() != null) {
            task.setPassThreshold(request.passThreshold());
        }
        Task saved = taskRepository.save(task);
        auditService.log("TASK_UPDATED", user.getId(),
                String.format("{\"taskId\":%d}", taskId));
        return ResponseEntity.ok(TaskDto.fromEntity(saved));
    }

    @PostMapping("/tasks/{taskId}/materials")
    public ResponseEntity<TaskMaterialDto> addMaterial(@PathVariable Long taskId,
                                                       @RequestBody TaskMaterialDto request,
                                                       @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        verifyAccessToCourse(task.getCourse().getId(), user);
        if (request.fileKey() == null || request.fileKey().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        TaskMaterial saved = taskMaterialRepository.save(new TaskMaterial(task, request.fileKey(), request.originalFileName()));
        String downloadUrl = storageService.presignDownload(saved.getFileKey(), Duration.ofHours(24));
        return ResponseEntity.ok(new TaskMaterialDto(
                saved.getId(),
                taskId,
                saved.getFileKey(),
                saved.getOriginalFileName(),
                downloadUrl
        ));
    }

    @GetMapping("/tasks/{taskId}/materials")
    public ResponseEntity<List<TaskMaterialDto>> listMaterials(@PathVariable Long taskId,
                                                               @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        verifyAccessToCourse(task.getCourse().getId(), user);
        List<TaskMaterialDto> result = taskMaterialRepository.findByTaskId(taskId).stream()
                .map(m -> new TaskMaterialDto(
                        m.getId(),
                        taskId,
                        m.getFileKey(),
                        m.getOriginalFileName(),
                        storageService.presignDownload(m.getFileKey(), Duration.ofHours(24))
                ))
                .toList();
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/tasks/{taskId}/materials/{materialId}")
    public ResponseEntity<?> deleteMaterial(@PathVariable Long taskId,
                                            @PathVariable Long materialId,
                                            @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        verifyAccessToCourse(task.getCourse().getId(), user);
        TaskMaterial material = taskMaterialRepository.findById(materialId)
                .orElseThrow(() -> new IllegalArgumentException("Material not found"));
        if (!material.getTask().getId().equals(taskId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Material does not belong to task"));
        }
        taskMaterialRepository.delete(material);
        auditService.log("TASK_MATERIAL_DELETED", user.getId(),
                String.format("{\"taskId\":%d,\"materialId\":%d}", taskId, materialId));
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}






