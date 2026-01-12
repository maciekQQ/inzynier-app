package pl.inzynier.api.course;

// Backward compatibility alias
@Deprecated
public class Course extends ClassGroup {
    public Course() {
        super();
    }
    
    public Course(String name) {
        super(name);
    }
}






