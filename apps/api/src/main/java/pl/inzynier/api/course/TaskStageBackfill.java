package pl.inzynier.api.course;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pl.inzynier.api.course.StageRepository;
import pl.inzynier.api.course.Stage;
import pl.inzynier.api.course.Artifact;
import pl.inzynier.api.course.ArtifactRepository;
import pl.inzynier.api.course.ArtifactType;

import java.util.List;

/**
 * Uzupełnia brakujące etapy/artefakty dla zadań jednokrotnych utworzonych
 * przed dodaniem automatycznego etapu.
 */
@Component
public class TaskStageBackfill {

    private final TaskRepository taskRepository;
    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;

    public TaskStageBackfill(TaskRepository taskRepository,
                             StageRepository stageRepository,
                             ArtifactRepository artifactRepository) {
        this.taskRepository = taskRepository;
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
    }

    @PostConstruct
    @Transactional
    public void ensureStages() {
        List<Task> tasks = taskRepository.findAll();
        for (Task task : tasks) {
            boolean hasStage = !stageRepository.findByTaskId(task.getId()).isEmpty();
            if (hasStage) continue;

            Stage stage = new Stage(
                    task,
                    "Etap 1",
                    100,
                    task.getStartDate(),
                    task.getEndDate(),
                    0.0,
                    100.0
            );
            Stage savedStage = stageRepository.save(stage);
            artifactRepository.save(new Artifact(savedStage, "Plik do oddania", ArtifactType.OTHER, null, ""));
        }
    }
}

