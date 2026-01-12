package pl.inzynier.api.course;

import jakarta.persistence.*;

@Entity
@Table(name = "course_students", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"course_id", "student_id"})
})
public class ClassGroupStudent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private ClassGroup classGroup;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "group_name")
    private String groupName;

    @Column(name = "album_number")
    private String albumNumber;

    protected ClassGroupStudent() {
    }

    public ClassGroupStudent(ClassGroup classGroup, Long studentId) {
        this(classGroup, studentId, null, null);
    }

    public ClassGroupStudent(ClassGroup classGroup, Long studentId, String groupName, String albumNumber) {
        this.classGroup = classGroup;
        this.studentId = studentId;
        this.groupName = groupName;
        this.albumNumber = albumNumber;
    }

    public Long getId() {
        return id;
    }

    public ClassGroup getClassGroup() {
        return classGroup;
    }

    public Long getStudentId() {
        return studentId;
    }

    public String getGroupName() {
        return groupName;
    }

    public String getAlbumNumber() {
        return albumNumber;
    }
}

