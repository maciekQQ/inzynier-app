package pl.inzynier.api.grade;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.grading.GradingQueueService;
import pl.inzynier.api.grading.LatePenaltyCalculator;
import pl.inzynier.api.queue.GradingQueueEntry;
import pl.inzynier.api.queue.GradingQueueId;
import pl.inzynier.api.queue.GradingQueueRepository;
import pl.inzynier.api.revision.Revision;
import pl.inzynier.api.revision.RevisionRepository;
import pl.inzynier.api.user.User;

@Service
public class GradeApplicationService {
    private final GradeRepository gradeRepository;
    private final RevisionRepository revisionRepository;
    private final GradingQueueService gradingQueueService;
    private final GradingQueueRepository gradingQueueRepository;
    private final LatePenaltyCalculator latePenaltyCalculator;
    private final AuditService auditService;

    public GradeApplicationService(GradeRepository gradeRepository,
                                   RevisionRepository revisionRepository,
                                   GradingQueueService gradingQueueService,
                                   GradingQueueRepository gradingQueueRepository,
                                   LatePenaltyCalculator latePenaltyCalculator,
                                   AuditService auditService) {
        this.gradeRepository = gradeRepository;
        this.revisionRepository = revisionRepository;
        this.gradingQueueService = gradingQueueService;
        this.gradingQueueRepository = gradingQueueRepository;
        this.latePenaltyCalculator = latePenaltyCalculator;
        this.auditService = auditService;
    }

    @Transactional
    public Grade gradeRevision(GradeRevisionRequest request, User teacher) {
        Revision revision = revisionRepository.findById(request.revisionId())
                .orElseThrow(() -> new IllegalArgumentException("Revision not found"));
        revision.transitionTo(request.statusAfterGrade());
        revisionRepository.save(revision);

        boolean skipPenalty = request.skipPenalty() != null && request.skipPenalty();
        Grade grade = new Grade(
                revision,
                teacher.getId(),
                request.points(),
                calculateNetto(revision, request.points(), skipPenalty),
                request.comment(),
                request.statusAfterGrade()
        );
        Grade saved = gradeRepository.save(grade);
        gradingQueueService.onGradeAssigned(revision.getId(), request.points(), request.statusAfterGrade());
        auditService.log("REVISION_GRADED", teacher.getId(),
                "{\"revisionId\":" + revision.getId() + ",\"gradeId\":" + saved.getId() + "}");
        return saved;
    }

    private double calculateNetto(Revision revision, double brutto, boolean skipPenalty) {
        var task = revision.getArtifact().getStage().getTask();
        if (skipPenalty) {
            return capByMode(brutto, task.getGradingMode(), task.getMaxPoints());
        }
        // Spróbuj użyć read-modelu kolejki (najświeższa kara)
        GradingQueueEntry entry = gradingQueueRepository.findById(
                new GradingQueueId(revision.getArtifact().getId(), revision.getStudentId())
        ).orElse(null);
        double base = brutto;
        var gradingMode = task.getGradingMode();
        // apply penalty percent
        if (entry != null && entry.getPenaltyPercentApplied() != null) {
            base = latePenaltyCalculator.applyPenalty(brutto, entry.getPenaltyPercentApplied());
            return capByMode(base, gradingMode, task.getMaxPoints());
        }
        // Fallback: policz z terminów etapu
        var stage = revision.getArtifact().getStage();
        double k = stage.getPenaltyKPercentPer24h() == null ? 0.0 : stage.getPenaltyKPercentPer24h();
        double m = stage.getPenaltyMaxMPercent() == null ? 100.0 : stage.getPenaltyMaxMPercent();
        double penalty = latePenaltyCalculator.computePenaltyPercent(
                stage.getSoftDeadline(),
                stage.getHardDeadline(),
                revision.getCreatedAt(),
                false,
                k,
                m
        );
        base = latePenaltyCalculator.applyPenalty(brutto, penalty);
        return capByMode(base, gradingMode, task.getMaxPoints());
    }

    private double capByMode(double value, pl.inzynier.api.course.GradingMode gradingMode, Double maxPoints) {
        if (gradingMode == pl.inzynier.api.course.GradingMode.POINTS10) {
            double max = maxPoints != null ? maxPoints : 10.0;
            return Math.max(0.0, Math.min(max, value));
        }
        return Math.max(0.0, Math.min(100.0, value));
    }
}

