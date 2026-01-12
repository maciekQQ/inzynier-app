package pl.inzynier.api.revision;

import jakarta.persistence.*;
import java.time.Instant;
import pl.inzynier.api.user.User;

@Entity
@Table(name = "revision_feedback_materials")
public class RevisionFeedbackMaterial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revision_id", nullable = false)
    private Revision revision;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "file_key", nullable = false, length = 500)
    private String fileKey;

    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected RevisionFeedbackMaterial() {
    }

    public RevisionFeedbackMaterial(Revision revision, User teacher, String fileKey, String originalFileName) {
        this.revision = revision;
        this.teacher = teacher;
        this.fileKey = fileKey;
        this.originalFileName = originalFileName;
    }

    public Long getId() {
        return id;
    }

    public Revision getRevision() {
        return revision;
    }

    public String getFileKey() {
        return fileKey;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

