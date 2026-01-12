package pl.inzynier.api.course;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private ClassGroup course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private Session session;

    @Enumerated(EnumType.STRING)
    @Column(name = "grading_mode")
    private GradingMode gradingMode = GradingMode.PERCENT;

@Column(name = "max_points")
private Double maxPoints = 10.0;

@Column(name = "pass_threshold")
private Double passThreshold;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "end_date")
    private Instant endDate;

    @Column(name = "teacher_id")
    private Long teacherId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Task() {
    }

public Task(ClassGroup course, String title, String description, Instant startDate, Instant endDate, Long teacherId) {
    this(course, null, title, description, startDate, endDate, teacherId, GradingMode.PERCENT, 10.0);
}

public Task(ClassGroup course, Session session, String title, String description, Instant startDate, Instant endDate, Long teacherId, GradingMode gradingMode) {
    this(course, session, title, description, startDate, endDate, teacherId, gradingMode, 10.0, null);
}

public Task(ClassGroup course, Session session, String title, String description, Instant startDate, Instant endDate, Long teacherId, GradingMode gradingMode, Double maxPoints) {
    this(course, session, title, description, startDate, endDate, teacherId, gradingMode, maxPoints, null);
}

public Task(ClassGroup course, Session session, String title, String description, Instant startDate, Instant endDate, Long teacherId, GradingMode gradingMode, Double maxPoints, Double passThreshold) {
    this.course = course;
    this.session = session;
    this.title = title;
    this.description = description;
    this.startDate = startDate;
    this.endDate = endDate;
    this.teacherId = teacherId;
    this.gradingMode = gradingMode != null ? gradingMode : GradingMode.PERCENT;
    this.maxPoints = maxPoints != null ? maxPoints : 10.0;
    this.passThreshold = passThreshold;
}

    public Long getId() {
        return id;
    }

    public ClassGroup getCourse() {
        return course;
    }

    public Session getSession() {
        return session;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Instant getStartDate() {
        return startDate;
    }

    public Instant getEndDate() {
        return endDate;
    }

    public Long getTeacherId() {
        return teacherId;
    }

    public GradingMode getGradingMode() {
        return gradingMode;
    }

public Double getMaxPoints() {
    return maxPoints;
}

public Double getPassThreshold() {
    return passThreshold;
}

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void updateDates(Instant start, Instant end) {
        this.startDate = start;
        this.endDate = end;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setGradingMode(GradingMode gradingMode) {
        this.gradingMode = gradingMode;
    }

public void setMaxPoints(Double maxPoints) {
    this.maxPoints = maxPoints;
}

public void setPassThreshold(Double passThreshold) {
    this.passThreshold = passThreshold;
}
}






