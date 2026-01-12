package pl.inzynier.api.course;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "stages")
public class Stage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(nullable = false)
    private String name;

    @Column(name = "weight_percent", nullable = false)
    private int weightPercent;

    @Column(name = "soft_deadline")
    private Instant softDeadline;

    @Column(name = "hard_deadline")
    private Instant hardDeadline;

    @Column(name = "penalty_k_percent_per_24h")
    private Double penaltyKPercentPer24h;

    @Column(name = "penalty_max_m_percent")
    private Double penaltyMaxMPercent;

    protected Stage() {
    }

    public Stage(Task task, String name, int weightPercent, Instant softDeadline, Instant hardDeadline,
                 Double penaltyKPercentPer24h, Double penaltyMaxMPercent) {
        this.task = task;
        this.name = name;
        this.weightPercent = weightPercent;
        this.softDeadline = softDeadline;
        this.hardDeadline = hardDeadline;
        this.penaltyKPercentPer24h = penaltyKPercentPer24h;
        this.penaltyMaxMPercent = penaltyMaxMPercent;
    }

    public Long getId() {
        return id;
    }

    public Task getTask() {
        return task;
    }

    public String getName() {
        return name;
    }

    public int getWeightPercent() {
        return weightPercent;
    }

    public Instant getSoftDeadline() {
        return softDeadline;
    }

    public Instant getHardDeadline() {
        return hardDeadline;
    }

    public Double getPenaltyKPercentPer24h() {
        return penaltyKPercentPer24h;
    }

    public Double getPenaltyMaxMPercent() {
        return penaltyMaxMPercent;
    }

    public void update(String name, int weightPercent, Instant softDeadline, Instant hardDeadline,
                       Double penaltyKPercentPer24h, Double penaltyMaxMPercent) {
        this.name = name;
        this.weightPercent = weightPercent;
        this.softDeadline = softDeadline;
        this.hardDeadline = hardDeadline;
        this.penaltyKPercentPer24h = penaltyKPercentPer24h;
        this.penaltyMaxMPercent = penaltyMaxMPercent;
    }
}






