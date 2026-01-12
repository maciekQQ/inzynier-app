package pl.inzynier.api.revision;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import pl.inzynier.api.user.User;

import java.util.Map;

@RestController
@RequestMapping("/api/revisions")
public class RevisionController {

    private final RevisionApplicationService revisionApplicationService;
    private final RevisionRepository revisionRepository;
    private final RevisionFeedbackMaterialRepository feedbackMaterialRepository;
    private final pl.inzynier.api.storage.StorageService storageService;

    public RevisionController(RevisionApplicationService revisionApplicationService,
                              RevisionRepository revisionRepository,
                              RevisionFeedbackMaterialRepository feedbackMaterialRepository,
                              pl.inzynier.api.storage.StorageService storageService) {
        this.revisionApplicationService = revisionApplicationService;
        this.revisionRepository = revisionRepository;
        this.feedbackMaterialRepository = feedbackMaterialRepository;
        this.storageService = storageService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT')")
    public ResponseEntity<?> submit(@Valid @RequestBody SubmitRevisionRequest request,
                                           @AuthenticationPrincipal User user) {
        Revision saved = revisionApplicationService.submitRevision(request, user);
        return ResponseEntity.ok(Map.of("revisionId", saved.getId()));
    }

    public record FeedbackMaterialRequest(String fileKey, String originalFileName) {}

    @PostMapping("/{revisionId}/feedback-materials")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
    public ResponseEntity<?> addFeedbackMaterial(@PathVariable Long revisionId,
                                                 @Valid @RequestBody FeedbackMaterialRequest request,
                                                 @AuthenticationPrincipal User teacher) {
        if (request.fileKey() == null || request.fileKey().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "fileKey required"));
        }
        Revision revision = revisionRepository.findById(revisionId)
                .orElseThrow(() -> new IllegalArgumentException("Revision not found"));
        RevisionFeedbackMaterial saved = feedbackMaterialRepository.save(
                new RevisionFeedbackMaterial(revision, teacher, request.fileKey(), request.originalFileName())
        );
        String url = storageService.presignDownload(saved.getFileKey(), java.time.Duration.ofHours(12));
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "downloadUrl", url
        ));
    }
}






