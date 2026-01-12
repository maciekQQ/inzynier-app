package pl.inzynier.api.course;

import java.util.List;
import java.util.Optional;

// Backward compatibility alias
@Deprecated
public interface CourseStudentRepository extends ClassGroupStudentRepository {
    @Deprecated
    default List<ClassGroupStudent> findByCourseId(Long courseId) {
        return findByClassGroupId(courseId);
    }
    
    @Deprecated
    default Optional<ClassGroupStudent> findByCourseIdAndStudentId(Long courseId, Long studentId) {
        return findByClassGroupIdAndStudentId(courseId, studentId);
    }
}

