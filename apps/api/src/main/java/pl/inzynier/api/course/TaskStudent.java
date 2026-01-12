package pl.inzynier.api.course;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Przypisanie studenta do zadania.
 * Student widzi tylko zadania, do których został przypisany.
 */
@Entity
@Table(name = "task_students", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"task_id", "student_id"})
})
public class TaskStudent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt = Instant.now();

    @Column(name = "assigned_by")
    private Long assignedBy; // który teacher przypisał

    protected TaskStudent() {
    }

    public TaskStudent(Task task, Long studentId, Long assignedBy) {
        this.task = task;
        this.studentId = studentId;
        this.assignedBy = assignedBy;
    }

    public Long getId() {
        return id;
    }

    public Task getTask() {
        return task;
    }

    public Long getStudentId() {
        return studentId;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Long getAssignedBy() {
        return assignedBy;
    }
}

