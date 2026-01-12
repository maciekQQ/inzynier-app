package pl.inzynier.api.grading;

import org.springframework.stereotype.Service;
import pl.inzynier.api.course.Artifact;
import pl.inzynier.api.course.ArtifactRepository;
import pl.inzynier.api.course.Stage;
import pl.inzynier.api.course.StageRepository;
import pl.inzynier.api.course.Task;
import pl.inzynier.api.queue.GradingQueueEntry;
import pl.inzynier.api.queue.GradingQueueId;
import pl.inzynier.api.queue.GradingQueueRepository;
import pl.inzynier.api.revision.RevisionStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AggregationService {

    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;
    private final GradingQueueRepository gradingQueueRepository;

    public AggregationService(StageRepository stageRepository,
                              ArtifactRepository artifactRepository,
                              GradingQueueRepository gradingQueueRepository) {
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
        this.gradingQueueRepository = gradingQueueRepository;
    }

    public AggregationResult aggregateTaskForStudent(Task task, Long studentId) {
        List<Stage> stages = stageRepository.findByTaskId(task.getId());
        double weighted = 0.0;
        int totalWeight = 0;
        for (Stage stage : stages) {
            List<Artifact> artifacts = artifactRepository.findByStageId(stage.getId());
            double bestNet = 0.0;
            for (Artifact artifact : artifacts) {
                GradingQueueEntry e = gradingQueueRepository.findById(new GradingQueueId(artifact.getId(), studentId))
                        .orElse(null);
                if (e != null && e.getLastAcceptedPointsNetto() != null) {
                    bestNet = Math.max(bestNet, e.getLastAcceptedPointsNetto());
                }
            }
            weighted += bestNet * stage.getWeightPercent() / 100.0;
            totalWeight += stage.getWeightPercent();
        }
        return new AggregationResult(weighted, totalWeight);
    }

    public record AggregationResult(double points, int weightTotal) {}
}

