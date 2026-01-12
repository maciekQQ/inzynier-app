package pl.inzynier.api.grading;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.inzynier.api.course.*;
import pl.inzynier.api.queue.GradingQueueEntry;
import pl.inzynier.api.queue.GradingQueueId;
import pl.inzynier.api.queue.GradingQueueRepository;
import pl.inzynier.api.revision.Revision;
import pl.inzynier.api.revision.RevisionStatus;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;

import java.time.Instant;
import java.util.Optional;

@Service
public class GradingQueueService {

    private final GradingQueueRepository gradingQueueRepository;
    private final LatePenaltyCalculator latePenaltyCalculator;
    private final StageExemptionRepository stageExemptionRepository;
    private final UserRepository userRepository;
    private final CourseStudentRepository courseStudentRepository;
    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;

    public GradingQueueService(GradingQueueRepository gradingQueueRepository,
                               LatePenaltyCalculator latePenaltyCalculator,
                               StageExemptionRepository stageExemptionRepository,
                               UserRepository userRepository,
                               CourseStudentRepository courseStudentRepository,
                               StageRepository stageRepository,
                               ArtifactRepository artifactRepository) {
        this.gradingQueueRepository = gradingQueueRepository;
        this.latePenaltyCalculator = latePenaltyCalculator;
        this.stageExemptionRepository = stageExemptionRepository;
        this.userRepository = userRepository;
        this.courseStudentRepository = courseStudentRepository;
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
    }

    @Transactional
    public void onRevisionSubmitted(Revision revision) {
        Artifact artifact = revision.getArtifact();
        Stage stage = artifact.getStage();
        Task task = stage.getTask();
        ClassGroup course = task.getCourse();

        Optional<ClassGroupStudent> courseStudent = courseStudentRepository.findByCourseIdAndStudentId(course.getId(), revision.getStudentId());
        Optional<StageExemption> exemption = stageExemptionRepository.findByStageIdAndStudentId(stage.getId(), revision.getStudentId());
        Instant soft = exemption.map(StageExemption::getCustomSoft).orElse(stage.getSoftDeadline());
        Instant hard = exemption.map(StageExemption::getCustomHard).orElse(stage.getHardDeadline());
        boolean allowAfterHard = exemption.map(StageExemption::isAllowAfterHard).orElse(false);

        double penalty = latePenaltyCalculator.computePenaltyPercent(
                soft,
                hard,
                revision.getCreatedAt(),
                allowAfterHard,
                stage.getPenaltyKPercentPer24h() == null ? 0.0 : stage.getPenaltyKPercentPer24h(),
                stage.getPenaltyMaxMPercent() == null ? 0.0 : stage.getPenaltyMaxMPercent()
        );

        GradingQueueId id = new GradingQueueId(artifact.getId(), revision.getStudentId());
        GradingQueueEntry entry = gradingQueueRepository.findById(id).orElseGet(() -> new GradingQueueEntry(id));
        entry.setStageId(stage.getId());
        entry.setTaskId(task.getId());
        entry.setCourseId(course.getId());
        entry.setAlbumNumber(courseStudent.map(ClassGroupStudent::getAlbumNumber).orElse(null));
        entry.setStudentName(courseStudent.flatMap(cs -> userRepository.findById(cs.getStudentId()))
                .map(u -> u.getFirstName() + " " + u.getLastName())
                .orElse(null));
        entry.setLastRevisionId(revision.getId());
        entry.setLastRevisionStatus(revision.getStatus());
        entry.setLastSubmittedAt(revision.getCreatedAt());
        entry.setSoftDeadline(soft);
        entry.setHardDeadline(hard);
        double k = stage.getPenaltyKPercentPer24h() == null ? 0.0 : stage.getPenaltyKPercentPer24h();
        entry.setLateDaysStarted24h(k > 0 ? (int) Math.ceil(penalty / k) : 0);
        entry.setPenaltyPercentApplied(penalty);
        entry.setFlagNewSubmission(true);
        gradingQueueRepository.save(entry);
    }

    @Transactional
    public void onGradeAssigned(Long revisionId, double points, RevisionStatus statusAfterGrade) {
        gradingQueueRepository.findAll().stream()
                .filter(e -> revisionId.equals(e.getLastRevisionId()))
                .findFirst()
                .ifPresent(entry -> {
                    entry.setLastPointsBrutto(points);
                    Double penalty = entry.getPenaltyPercentApplied() == null ? 0.0 : entry.getPenaltyPercentApplied();
                    double netto = latePenaltyCalculator.applyPenalty(points, penalty);
                    entry.setLastPointsNetto(netto);
                    entry.setLastRevisionStatus(statusAfterGrade);
                    entry.setFlagNewSubmission(false);
                    if (statusAfterGrade == RevisionStatus.ACCEPTED) {
                        entry.setLastAcceptedRevisionId(revisionId);
                        entry.setLastAcceptedPointsNetto(netto);
                    }
                    gradingQueueRepository.save(entry);
                });
    }

    @Transactional
    public void recomputeForStageAndStudent(Long stageId, Long studentId) {
        Stage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new IllegalArgumentException("Stage not found"));
        var artifacts = artifactRepository.findByStageId(stageId);
        var exemption = stageExemptionRepository.findByStageIdAndStudentId(stageId, studentId);

        Instant soft = exemption.map(StageExemption::getCustomSoft).orElse(stage.getSoftDeadline());
        Instant hard = exemption.map(StageExemption::getCustomHard).orElse(stage.getHardDeadline());
        boolean allowAfterHard = exemption.map(StageExemption::isAllowAfterHard).orElse(false);
        double k = stage.getPenaltyKPercentPer24h() == null ? 0.0 : stage.getPenaltyKPercentPer24h();

        for (Artifact artifact : artifacts) {
            GradingQueueEntry entry = gradingQueueRepository.findById(new GradingQueueId(artifact.getId(), studentId))
                    .orElse(null);
            if (entry == null || entry.getLastSubmittedAt() == null) {
                continue;
            }
            double penalty = latePenaltyCalculator.computePenaltyPercent(
                    soft,
                    hard,
                    entry.getLastSubmittedAt(),
                    allowAfterHard,
                    k,
                    stage.getPenaltyMaxMPercent() == null ? 0.0 : stage.getPenaltyMaxMPercent()
            );
            entry.setSoftDeadline(soft);
            entry.setHardDeadline(hard);
            entry.setLateDaysStarted24h(k > 0 ? (int) Math.ceil(penalty / k) : 0);
            entry.setPenaltyPercentApplied(penalty);
            if (entry.getLastPointsBrutto() != null) {
                entry.setLastPointsNetto(latePenaltyCalculator.applyPenalty(entry.getLastPointsBrutto(), penalty));
            }
            gradingQueueRepository.save(entry);
        }
    }
}

