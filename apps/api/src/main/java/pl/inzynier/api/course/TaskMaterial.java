package pl.inzynier.api.course;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "task_materials")
public class TaskMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "file_key", nullable = false, length = 500)
    private String fileKey;

    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected TaskMaterial() {
    }

    public TaskMaterial(Task task, String fileKey, String originalFileName) {
        this.task = task;
        this.fileKey = fileKey;
        this.originalFileName = originalFileName;
    }

    public Long getId() {
        return id;
    }

    public Task getTask() {
        return task;
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

