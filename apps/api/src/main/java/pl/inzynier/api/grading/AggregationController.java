package pl.inzynier.api.grading;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.inzynier.api.course.Task;
import pl.inzynier.api.course.TaskRepository;

import java.util.Map;

@RestController
@RequestMapping("/api/aggregation")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
public class AggregationController {

    private final TaskRepository taskRepository;
    private final AggregationService aggregationService;

    public AggregationController(TaskRepository taskRepository,
                                 AggregationService aggregationService) {
        this.taskRepository = taskRepository;
        this.aggregationService = aggregationService;
    }

    @GetMapping("/task/{taskId}/student/{studentId}")
    public ResponseEntity<Map<String, Object>> aggregate(@PathVariable Long taskId, @PathVariable Long studentId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        AggregationService.AggregationResult res = aggregationService.aggregateTaskForStudent(task, studentId);
        return ResponseEntity.ok(Map.of(
                "pointsNet", res.points(),
                "weightTotal", res.weightTotal()
        ));
    }
}






