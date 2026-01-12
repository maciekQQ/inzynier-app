package pl.inzynier.api.course;

import jakarta.persistence.*;

@Entity
@Table(name = "course_teachers", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"course_id", "teacher_id"})
})
public class ClassGroupTeacher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private ClassGroup classGroup;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    protected ClassGroupTeacher() {
    }

    public ClassGroupTeacher(ClassGroup classGroup, Long teacherId) {
        this.classGroup = classGroup;
        this.teacherId = teacherId;
    }

    public Long getId() {
        return id;
    }

    public ClassGroup getClassGroup() {
        return classGroup;
    }

    public Long getTeacherId() {
        return teacherId;
    }
}

