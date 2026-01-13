package pl.inzynier.api.stats;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.inzynier.api.course.Artifact;
import pl.inzynier.api.course.ArtifactRepository;
import pl.inzynier.api.course.StageRepository;
import pl.inzynier.api.course.Task;
import pl.inzynier.api.course.TaskRepository;
import pl.inzynier.api.course.CourseRepository;
import pl.inzynier.api.course.ClassGroup;
import pl.inzynier.api.queue.GradingQueueEntry;
import pl.inzynier.api.queue.GradingQueueRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEACHER')")
public class StatsController {

    private final GradingQueueRepository gradingQueueRepository;
    private final ArtifactRepository artifactRepository;
    private final StageRepository stageRepository;
    private final TaskRepository taskRepository;
    private final CourseRepository courseRepository;

    public StatsController(GradingQueueRepository gradingQueueRepository,
                           ArtifactRepository artifactRepository,
                           StageRepository stageRepository,
                           TaskRepository taskRepository,
                           CourseRepository courseRepository) {
        this.gradingQueueRepository = gradingQueueRepository;
        this.artifactRepository = artifactRepository;
        this.stageRepository = stageRepository;
        this.taskRepository = taskRepository;
        this.courseRepository = courseRepository;
    }

    @GetMapping("/overview")
    public ResponseEntity<List<StatsDto>> overview() {
        List<GradingQueueEntry> entries = gradingQueueRepository.findAll();
        Map<Long, Task> taskCache = new HashMap<>();
        Map<Long, ClassGroup> courseCache = new HashMap<>();
        Map<Long, Artifact> artifactCache = new HashMap<>();

        Map<Long, int[]> counters = new HashMap<>(); // taskId -> [passed, failed, pending]

        for (GradingQueueEntry entry : entries) {
            Artifact artifact = artifactCache.computeIfAbsent(entry.getArtifactId(), id -> artifactRepository.findById(id).orElse(null));
            if (artifact == null) continue;
            Task task = taskCache.computeIfAbsent(artifact.getStage().getTask().getId(),
                    id -> taskRepository.findById(id).orElse(null));
            if (task == null) continue;

            int[] arr = counters.computeIfAbsent(task.getId(), id -> new int[]{0, 0, 0});
            String status = entry.getLastRevisionStatus();
            if ("ACCEPTED".equals(status)) arr[0]++; // passed
            else if ("REJECTED".equals(status)) arr[1]++; // failed
            else arr[2]++; // pending/needs_fix/none

            // ensure course cached
            courseCache.computeIfAbsent(task.getCourse().getId(), id -> courseRepository.findById(id).orElse(null));
        }

        List<StatsDto> result = new ArrayList<>();
        counters.forEach((taskId, arr) -> {
            Task task = taskCache.get(taskId);
            if (task != null) {
                ClassGroup course = courseCache.get(task.getCourse().getId());
                result.add(new StatsDto(
                        taskId,
                        task.getTitle(),
                        course != null ? course.getId() : null,
                        course != null ? course.getName() : "—",
                        arr[0],
                        arr[1],
                        arr[2]
                ));
            }
        });

        return ResponseEntity.ok(result);
    }
}

