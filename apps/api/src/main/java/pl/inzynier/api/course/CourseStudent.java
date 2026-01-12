package pl.inzynier.api.course;

// Backward compatibility alias
@Deprecated
public class CourseStudent extends ClassGroupStudent {
    public CourseStudent() {
        super();
    }
    
    public CourseStudent(ClassGroup course, Long studentId, String groupName, String albumNumber) {
        super(course, studentId, groupName, albumNumber);
    }
    
    public CourseStudent(ClassGroup course, Long studentId) {
        super(course, studentId);
    }
    
    @Deprecated
    public ClassGroup getCourse() {
        return getClassGroup();
    }
}






