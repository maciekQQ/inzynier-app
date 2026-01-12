package pl.inzynier.api.revision;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.inzynier.api.grade.GradeRepository;
import pl.inzynier.api.storage.StorageService;
import pl.inzynier.api.user.User;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/revisions")
public class RevisionQueryController {

    private final RevisionRepository revisionRepository;
    private final GradeRepository gradeRepository;
    private final StorageService storageService;
    private final RevisionFeedbackMaterialRepository feedbackMaterialRepository;

    public RevisionQueryController(RevisionRepository revisionRepository, GradeRepository gradeRepository, StorageService storageService, RevisionFeedbackMaterialRepository feedbackMaterialRepository) {
        this.revisionRepository = revisionRepository;
        this.gradeRepository = gradeRepository;
        this.storageService = storageService;
        this.feedbackMaterialRepository = feedbackMaterialRepository;
    }

    @GetMapping("/artifact/{artifactId}/me")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT')")
    public ResponseEntity<List<RevisionHistoryDto>> myRevisions(@PathVariable Long artifactId,
                                                                @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(mapHistory(
                revisionRepository.findByArtifactIdAndStudentIdOrderByCreatedAtDesc(artifactId, user.getId())
        ));
    }

    @GetMapping("/artifact/{artifactId}/student/{studentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
    public ResponseEntity<List<RevisionHistoryDto>> studentRevisions(@PathVariable Long artifactId,
                                                                     @PathVariable Long studentId) {
        return ResponseEntity.ok(mapHistory(
                revisionRepository.findByArtifactIdAndStudentIdOrderByCreatedAtDesc(artifactId, studentId)
        ));
    }

    @GetMapping("/{revisionId}/download")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT','ROLE_TEACHER','ROLE_ADMIN')")
    public ResponseEntity<?> downloadLink(@PathVariable Long revisionId,
                                          @AuthenticationPrincipal User user) {
        Revision rev = revisionRepository.findById(revisionId)
                .orElseThrow(() -> new IllegalArgumentException("Revision not found"));
        if (user.getRole() == pl.inzynier.api.user.UserRole.STUDENT && !rev.getStudentId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Brak dostępu"));
        }
        String url = storageService.presignDownload(rev.getFileKey(), Duration.ofHours(12));
        return ResponseEntity.ok(Map.of(
                "revisionId", revisionId,
                "downloadUrl", url,
                "fileName", rev.getOriginalFileName()
        ));
    }

    private List<RevisionHistoryDto> mapHistory(List<Revision> revisions) {
        return revisions.stream()
                .map(r -> new RevisionHistoryDto(
                        r.getId(),
                        r.getCreatedAt(),
                        r.getStatus(),
                        r.getOriginalFileName(),
                        r.getSizeBytes(),
                        r.getComment(),
                        storageService.presignDownload(r.getFileKey(), Duration.ofHours(12)),
                        gradeRepository.findByRevisionId(r.getId()).stream()
                                .map(g -> new RevisionHistoryDto.RevisionGradeDto(
                                        g.getId(),
                                        g.getTeacherId(),
                                        g.getPointsBrutto(),
                                        g.getPointsNetto(),
                                        g.getComment(),
                                        g.getCreatedAt(),
                                        g.getStatusAfterGrade()
                                ))
                                .toList(),
                        feedbackMaterialRepository.findByRevisionIdOrderByCreatedAtDesc(r.getId()).stream()
                                .map(f -> new RevisionHistoryDto.RevisionFeedbackMaterialDto(
                                        f.getId(),
                                        f.getOriginalFileName(),
                                        storageService.presignDownload(f.getFileKey(), Duration.ofHours(12)),
                                        f.getCreatedAt()
                                ))
                                .toList()
                ))
                .toList();
    }
}






