package pl.inzynier.api.revision;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.inzynier.api.course.Artifact;
import pl.inzynier.api.course.ArtifactRepository;
import pl.inzynier.api.grading.GradingQueueService;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.user.User;

@Service
public class RevisionApplicationService {

    private final ArtifactRepository artifactRepository;
    private final RevisionRepository revisionRepository;
    private final GradingQueueService gradingQueueService;
    private final AuditService auditService;

    public RevisionApplicationService(ArtifactRepository artifactRepository,
                                      RevisionRepository revisionRepository,
                                      GradingQueueService gradingQueueService,
                                      AuditService auditService) {
        this.artifactRepository = artifactRepository;
        this.revisionRepository = revisionRepository;
        this.gradingQueueService = gradingQueueService;
        this.auditService = auditService;
    }

    @Transactional
    public Revision submitRevision(SubmitRevisionRequest request, User student) {
        Artifact artifact = artifactRepository.findById(request.artifactId())
                .orElseThrow(() -> new IllegalArgumentException("Artifact not found"));

        Revision revision = new Revision(
                artifact,
                student.getId(),
                request.fileKey(),
                request.originalFileName(),
                request.mimeType(),
                request.sizeBytes()
        );
        if (request.comment() != null && !request.comment().isBlank()) {
            revision.setComment(request.comment());
        }
        Revision saved = revisionRepository.save(revision);
        gradingQueueService.onRevisionSubmitted(saved);
        auditService.log("REVISION_SUBMITTED", student.getId(),
                "{\"artifactId\":" + artifact.getId() + ",\"revisionId\":" + saved.getId() + "}");
        return saved;
    }
}

