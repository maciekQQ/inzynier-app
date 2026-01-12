package pl.inzynier.api.course;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import pl.inzynier.api.user.User;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER')")
public class TeacherCourseController {

    private final CourseTeacherRepository courseTeacherRepository;
    private final CourseRepository courseRepository;

    public TeacherCourseController(CourseTeacherRepository courseTeacherRepository,
                                   CourseRepository courseRepository) {
        this.courseTeacherRepository = courseTeacherRepository;
        this.courseRepository = courseRepository;
    }

    @GetMapping("/courses")
    public ResponseEntity<List<ClassGroup>> myCourses(@AuthenticationPrincipal User teacher) {
        List<Long> courseIds = courseTeacherRepository.findByTeacherId(teacher.getId()).stream()
                .map(ClassGroupTeacher::getClassGroup)
                .map(ClassGroup::getId)
                .collect(Collectors.toList());
        return ResponseEntity.ok(courseRepository.findAllById(courseIds));
    }
    
    /**
     * Przypisz siebie do kursu (workaround - normalnie admin to robi)
     */
    @PostMapping("/assign-to-course/{courseId}")
    public ResponseEntity<?> assignMeToCourse(@PathVariable Long courseId,
                                               @AuthenticationPrincipal User teacher) {
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        
        // Sprawdź czy już przypisany
        boolean alreadyAssigned = courseTeacherRepository.findByTeacherId(teacher.getId()).stream()
                .anyMatch(ct -> ct.getClassGroup().getId().equals(courseId));
        
        if (alreadyAssigned) {
            return ResponseEntity.ok(Map.of("status", "already_assigned"));
        }
        
        courseTeacherRepository.save(new ClassGroupTeacher(course, teacher.getId()));
        return ResponseEntity.ok(Map.of("status", "assigned"));
    }
}

