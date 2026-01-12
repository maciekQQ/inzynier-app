package pl.inzynier.api.grade;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import pl.inzynier.api.revision.Revision;
import pl.inzynier.api.revision.RevisionStatus;

@Entity
@Table(name = "grades")
public class Grade {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revision_id", nullable = false)
    @JsonIgnore
    private Revision revision;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "points_brutto")
    private Double pointsBrutto;

    @Column(name = "points_netto")
    private Double pointsNetto;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_after_grade", nullable = false)
    private RevisionStatus statusAfterGrade;

    protected Grade() {
    }

    public Grade(Revision revision, Long teacherId, Double pointsBrutto, Double pointsNetto, String comment, RevisionStatus statusAfterGrade) {
        this.revision = revision;
        this.teacherId = teacherId;
        this.pointsBrutto = pointsBrutto;
        this.pointsNetto = pointsNetto;
        this.comment = comment;
        this.statusAfterGrade = statusAfterGrade;
    }

    public Long getId() {
        return id;
    }

    public Revision getRevision() {
        return revision;
    }

    public Long getTeacherId() {
        return teacherId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Double getPointsBrutto() {
        return pointsBrutto;
    }

    public Double getPointsNetto() {
        return pointsNetto;
    }

    public String getComment() {
        return comment;
    }

    public RevisionStatus getStatusAfterGrade() {
        return statusAfterGrade;
    }
}






