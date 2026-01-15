package pl.inzynier.api.grading;

import org.springframework.stereotype.Service;
import pl.inzynier.api.course.Artifact;
import pl.inzynier.api.course.ArtifactRepository;
import pl.inzynier.api.course.Stage;
import pl.inzynier.api.course.StageRepository;
import pl.inzynier.api.course.Task;
import pl.inzynier.api.grade.Grade;
import pl.inzynier.api.grade.GradeRepository;
import pl.inzynier.api.queue.GradingQueueEntry;
import pl.inzynier.api.queue.GradingQueueRepository;
import pl.inzynier.api.revision.Revision;
import pl.inzynier.api.revision.RevisionRepository;
import pl.inzynier.api.revision.RevisionStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Comparator;

@Service
public class AggregationService {

    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;
    private final GradingQueueRepository gradingQueueRepository;
    private final RevisionRepository revisionRepository;
    private final GradeRepository gradeRepository;

    public AggregationService(StageRepository stageRepository,
                              ArtifactRepository artifactRepository,
                              GradingQueueRepository gradingQueueRepository,
                              RevisionRepository revisionRepository,
                              GradeRepository gradeRepository) {
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
        this.gradingQueueRepository = gradingQueueRepository;
        this.revisionRepository = revisionRepository;
        this.gradeRepository = gradeRepository;
    }

    public AggregationResult aggregateTaskForStudent(Task task, Long studentId) {
        List<Stage> stages = stageRepository.findByTaskId(task.getId());
        double weighted = 0.0;
        int totalWeight = 0;
        for (Stage stage : stages) {
            List<Artifact> artifacts = artifactRepository.findByStageId(stage.getId());
            double bestNet = 0.0;
            for (Artifact artifact : artifacts) {
                // System liczy ostatnią chronologicznie ACCEPTED rewizję, nie najlepszą punktowo
                Double lastAcceptedNetto = findLastAcceptedNetto(artifact.getId(), studentId);
                if (lastAcceptedNetto != null) {
                    bestNet = Math.max(bestNet, lastAcceptedNetto);
                }
            }
            weighted += bestNet * stage.getWeightPercent() / 100.0;
            totalWeight += stage.getWeightPercent();
        }
        return new AggregationResult(weighted, totalWeight);
    }

    private Double findLastAcceptedNetto(Long artifactId, Long studentId) {
        List<Revision> revisions = revisionRepository.findByArtifactIdAndStudentIdOrderByCreatedAtDesc(artifactId, studentId);
        Revision lastAccepted = revisions.stream()
                .filter(r -> r.getStatus() == RevisionStatus.ACCEPTED)
                .findFirst()
                .orElse(null);
        if (lastAccepted == null) {
            return null;
        }
        List<Grade> grades = gradeRepository.findByRevisionId(lastAccepted.getId());
        return grades.stream()
                .max(Comparator.comparing(Grade::getCreatedAt))
                .map(g -> g.getPointsNetto() != null ? g.getPointsNetto() : g.getPointsBrutto())
                .orElse(null);
    }

    public record AggregationResult(double points, int weightTotal) {}
}

