package pl.inzynier.api.course;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sessions")
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private ClassGroup course;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionType type;

    @Column(name = "tasks_count")
    private Integer tasksCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "grading_mode", nullable = false)
    private GradingMode gradingMode = GradingMode.PERCENT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Session() {}

    public Session(ClassGroup course, String name, SessionType type, Integer tasksCount, GradingMode gradingMode) {
        this.course = course;
        this.name = name;
        this.type = type;
        this.tasksCount = tasksCount;
        this.gradingMode = gradingMode != null ? gradingMode : GradingMode.PERCENT;
    }

    public Long getId() {
        return id;
    }

    public ClassGroup getCourse() {
        return course;
    }

    public String getName() {
        return name;
    }

    public SessionType getType() {
        return type;
    }

    public Integer getTasksCount() {
        return tasksCount;
    }

    public GradingMode getGradingMode() {
        return gradingMode;
    }
}

