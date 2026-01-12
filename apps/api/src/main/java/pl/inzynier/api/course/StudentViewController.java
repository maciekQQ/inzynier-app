package pl.inzynier.api.course;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.inzynier.api.course.dto.StudentTaskViewDto;
import pl.inzynier.api.course.dto.TaskMaterialDto;
import pl.inzynier.api.queue.GradingQueueEntry;
import pl.inzynier.api.queue.GradingQueueId;
import pl.inzynier.api.queue.GradingQueueRepository;
import pl.inzynier.api.user.User;
import pl.inzynier.api.storage.StorageService;
import pl.inzynier.api.course.GradingMode;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT')")
public class StudentViewController {

    private final CourseStudentRepository courseStudentRepository;
    private final CourseRepository courseRepository;
    private final TaskRepository taskRepository;
    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;
    private final GradingQueueRepository queueRepository;
    private final TaskStudentRepository taskStudentRepository;
    private final TaskMaterialRepository taskMaterialRepository;
    private final StorageService storageService;

    public StudentViewController(CourseStudentRepository courseStudentRepository,
                                 CourseRepository courseRepository,
                                 TaskRepository taskRepository,
                                 StageRepository stageRepository,
                                 ArtifactRepository artifactRepository,
                                 GradingQueueRepository queueRepository,
                                 TaskStudentRepository taskStudentRepository,
                                 TaskMaterialRepository taskMaterialRepository,
                                 StorageService storageService) {
        this.courseStudentRepository = courseStudentRepository;
        this.courseRepository = courseRepository;
        this.taskRepository = taskRepository;
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
        this.queueRepository = queueRepository;
        this.taskStudentRepository = taskStudentRepository;
        this.taskMaterialRepository = taskMaterialRepository;
        this.storageService = storageService;
    }

    @GetMapping("/courses")
    public ResponseEntity<List<ClassGroup>> myCourses(@AuthenticationPrincipal User student) {
        List<Long> courseIds = courseStudentRepository.findByStudentId(student.getId()).stream()
                .map(ClassGroupStudent::getClassGroup)
                .map(ClassGroup::getId)
                .toList();
        return ResponseEntity.ok(courseRepository.findAllById(courseIds));
    }

    @GetMapping("/courses/{courseId}/tasks")
    public ResponseEntity<List<Task>> myTasks(@PathVariable Long courseId) {
        return ResponseEntity.ok(taskRepository.findByCourseId(courseId));
    }

    @GetMapping("/tasks/{taskId}/stages")
    public ResponseEntity<List<Stage>> myStages(@PathVariable Long taskId) {
        return ResponseEntity.ok(stageRepository.findByTaskId(taskId));
    }

    @GetMapping("/stages/{stageId}/artifacts")
    public ResponseEntity<List<Artifact>> myArtifacts(@PathVariable Long stageId) {
        return ResponseEntity.ok(artifactRepository.findByStageId(stageId));
    }

    /**
     * Nowy endpoint: Widok tabelaryczny dla studenta (wszystkie zadania w kursie).
     * Zwraca płaską listę: zadanie → etap → artefakt + terminy + statusy.
     * UWAGA: Student widzi tylko zadania, do których został przypisany (TaskStudent).
     * Kompatybilność wsteczna: jeśli zadanie nie ma przypisań = wszyscy widzą.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/courses/{courseId}/overview")
    public ResponseEntity<List<StudentTaskViewDto>> courseOverview(
            @PathVariable Long courseId,
            @AuthenticationPrincipal User student) {
        
        List<Task> tasks = taskRepository.findByCourseId(courseId);
        List<StudentTaskViewDto> result = new ArrayList<>();
        Instant now = Instant.now();

        for (Task task : tasks) {
            // Sprawdź czy student ma dostęp do tego zadania
            boolean hasAccess = hasAccessToTask(task.getId(), student.getId());
            if (!hasAccess) {
                continue; // Pomijamy zadanie
            }
            
            List<Stage> stages = stageRepository.findByTaskId(task.getId());
            for (Stage stage : stages) {
                List<Artifact> artifacts = artifactRepository.findByStageId(stage.getId());
                for (Artifact artifact : artifacts) {
                    GradingQueueEntry queue = queueRepository.findById(
                            new GradingQueueId(artifact.getId(), student.getId())
                    ).orElse(null);

                    Integer daysUntilSoft = null;
                    Integer daysOverdue = null;
                    
                    if (stage.getSoftDeadline() != null) {
                        long diff = Duration.between(now, stage.getSoftDeadline()).toDays();
                        if (diff >= 0) {
                            daysUntilSoft = (int) diff;
                        } else {
                            daysOverdue = (int) Math.abs(diff);
                        }
                    }

                    String statusLabel = StudentTaskViewDto.computeStatusLabel(
                            queue != null ? queue.getLastRevisionStatus() : null,
                            daysUntilSoft,
                            daysOverdue
                    );

                    List<TaskMaterialDto> materials = taskMaterialRepository.findByTaskId(task.getId()).stream()
                            .map(m -> new TaskMaterialDto(
                                    m.getId(),
                                    task.getId(),
                                    m.getFileKey(),
                                    m.getOriginalFileName(),
                                    storageService.presignDownload(m.getFileKey(), Duration.ofHours(24))
                            ))
                            .collect(Collectors.toList());

                    result.add(new StudentTaskViewDto(
                            task.getId(),
                            task.getTitle(),
                            task.getDescription(),
                            task.getSession() != null ? task.getSession().getId() : null,
                            task.getSession() != null ? task.getSession().getName() : null,
                            stage.getId(),
                            stage.getName(),
                            stage.getWeightPercent(),
                            stage.getSoftDeadline(),
                            stage.getHardDeadline(),
                            artifact.getId(),
                            artifact.getName(),
                            task.getGradingMode() != null ? task.getGradingMode().name() : GradingMode.PERCENT.name(),
                            queue != null ? queue.getLastRevisionStatus() : null,
                            queue != null ? queue.getLastSubmittedAt() : null,
                            queue != null ? queue.getLastPointsNetto() : null,
                            daysUntilSoft,
                            daysOverdue,
                            statusLabel,
                            materials
                    ));
                }
            }
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Pomocnicza metoda: sprawdza czy student ma dostęp do zadania.
     * OPCJA A (kompatybilność wsteczna):
     * - Jeśli zadanie NIE MA przypisań → wszyscy z kursu widzą
     * - Jeśli zadanie MA przypisania → tylko przypisani widzą
     */
    private boolean hasAccessToTask(Long taskId, Long studentId) {
        // Sprawdź czy są jakieś przypisania dla tego zadania
        long assignmentCount = taskStudentRepository.countByTaskId(taskId);
        
        if (assignmentCount == 0) {
            // OPCJA A: Brak przypisań = wszyscy widzą (kompatybilność wsteczna)
            return true;
        } else {
            // Są przypisania: sprawdź czy student jest na liście
            return !taskStudentRepository.findByTaskIdAndStudentId(taskId, studentId).isEmpty();
        }
    }
}
