package pl.inzynier.api.revision;

import jakarta.persistence.*;
import java.time.Instant;
import pl.inzynier.api.course.Artifact;

@Entity
@Table(name = "revisions")
public class Revision {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artifact_id", nullable = false)
    private Artifact artifact;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "file_key", nullable = false)
    private String fileKey;

    @Column(name = "original_file_name", nullable = false)
    private String originalFileName;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RevisionStatus status = RevisionStatus.SUBMITTED;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    protected Revision() {
    }

    public Revision(Artifact artifact, Long studentId, String fileKey, String originalFileName,
                    String mimeType, Long sizeBytes) {
        this.artifact = artifact;
        this.studentId = studentId;
        this.fileKey = fileKey;
        this.originalFileName = originalFileName;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
    }

    public Long getId() {
        return id;
    }

    public Artifact getArtifact() {
        return artifact;
    }

    public Long getStudentId() {
        return studentId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getFileKey() {
        return fileKey;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public RevisionStatus getStatus() {
        return status;
    }

    /**
     * Dozwolone przejścia (rozszerzone o edycję i ponowne otwarcie):
     * - SUBMITTED -> NEEDS_FIX, ACCEPTED, REJECTED
     * - NEEDS_FIX -> SUBMITTED (ponowne złożenie)
     * - ACCEPTED/REJECTED -> NEEDS_FIX (ponowne otwarcie zadania) lub pozostanie w tym samym stanie (edycja oceny)
     */
    public void transitionTo(RevisionStatus target) {
        // no-op when status się nie zmienia (edycja oceny bez zmiany statusu)
        if (this.status == target) {
            return;
        }
        // pozwól na ponowne otwarcie: ACCEPTED/REJECTED -> NEEDS_FIX
        if ((this.status == RevisionStatus.ACCEPTED || this.status == RevisionStatus.REJECTED)
                && target == RevisionStatus.NEEDS_FIX) {
            this.status = target;
            return;
        }
        if (this.status == RevisionStatus.SUBMITTED) {
            if (target == RevisionStatus.NEEDS_FIX || target == RevisionStatus.ACCEPTED || target == RevisionStatus.REJECTED) {
                this.status = target;
                return;
            }
        }
        if (this.status == RevisionStatus.NEEDS_FIX) {
            if (target == RevisionStatus.SUBMITTED) {
                this.status = target;
                return;
            }
        }
        throw new IllegalArgumentException("Invalid revision status transition: " + this.status + " -> " + target);
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}






