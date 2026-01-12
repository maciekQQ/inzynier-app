package pl.inzynier.api.course;

// Backward compatibility alias
@Deprecated
public class CourseTeacher extends ClassGroupTeacher {
    public CourseTeacher() {
        super();
    }
    
    public CourseTeacher(ClassGroup course, Long teacherId) {
        super(course, teacherId);
    }
    
    @Deprecated
    public ClassGroup getCourse() {
        return getClassGroup();
    }
}






