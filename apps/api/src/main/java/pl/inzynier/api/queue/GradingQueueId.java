package pl.inzynier.api.queue;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class GradingQueueId implements Serializable {
    @Column(name = "artifact_id")
    private Long artifactId;

    @Column(name = "student_id")
    private Long studentId;

    public GradingQueueId() {
    }

    public GradingQueueId(Long artifactId, Long studentId) {
        this.artifactId = artifactId;
        this.studentId = studentId;
    }

    public Long getArtifactId() {
        return artifactId;
    }

    public Long getStudentId() {
        return studentId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof GradingQueueId that)) return false;
        return Objects.equals(artifactId, that.artifactId) && Objects.equals(studentId, that.studentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(artifactId, studentId);
    }
}






