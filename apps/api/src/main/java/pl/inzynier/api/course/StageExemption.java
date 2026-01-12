package pl.inzynier.api.course;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "stage_exemptions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"stage_id", "student_id"})
})
public class StageExemption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id", nullable = false)
    private Stage stage;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "allow_after_hard")
    private boolean allowAfterHard;

    @Column(name = "custom_soft")
    private Instant customSoft;

    @Column(name = "custom_hard")
    private Instant customHard;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    protected StageExemption() {
    }

    public StageExemption(Stage stage, Long studentId, boolean allowAfterHard,
                          Instant customSoft, Instant customHard, Long teacherId, String reason) {
        this.stage = stage;
        this.studentId = studentId;
        this.allowAfterHard = allowAfterHard;
        this.customSoft = customSoft;
        this.customHard = customHard;
        this.teacherId = teacherId;
        this.reason = reason;
    }

    public Long getId() {
        return id;
    }

    public Stage getStage() {
        return stage;
    }

    public Long getStudentId() {
        return studentId;
    }

    public boolean isAllowAfterHard() {
        return allowAfterHard;
    }

    public Instant getCustomSoft() {
        return customSoft;
    }

    public Instant getCustomHard() {
        return customHard;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Long getTeacherId() {
        return teacherId;
    }

    public String getReason() {
        return reason;
    }
}






