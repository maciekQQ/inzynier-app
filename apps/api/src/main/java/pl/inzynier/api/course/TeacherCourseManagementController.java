package pl.inzynier.api.course;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import pl.inzynier.api.course.dto.AddStudentToCourseRequest;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;
import pl.inzynier.api.user.UserRole;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/teacher/courses")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER')")
public class TeacherCourseManagementController {

    private final CourseRepository courseRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final CourseStudentRepository courseStudentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TeacherCourseManagementController(CourseRepository courseRepository,
                                             CourseTeacherRepository courseTeacherRepository,
                                             CourseStudentRepository courseStudentRepository,
                                             UserRepository userRepository,
                                             PasswordEncoder passwordEncoder) {
        this.courseRepository = courseRepository;
        this.courseTeacherRepository = courseTeacherRepository;
        this.courseStudentRepository = courseStudentRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Pobierz listę studentów w kursie
     */
    @GetMapping("/{courseId}/students")
    public ResponseEntity<List<Map<String, Object>>> getStudents(@PathVariable Long courseId,
                                                                 @AuthenticationPrincipal User teacher) {
        verifyAccess(courseId, teacher);

        List<ClassGroupStudent> students = courseStudentRepository.findByCourseId(courseId);

        List<Map<String, Object>> result = students.stream().map(cs -> {
            User student = userRepository.findById(cs.getStudentId()).orElse(null);

            // ✅ NAPRAWIONE - użyj HashMap zamiast Map.of()
            Map<String, Object> map = new HashMap<>();
            map.put("id", cs.getId());
            map.put("studentId", cs.getStudentId());
            map.put("albumNumber", cs.getAlbumNumber() != null ? cs.getAlbumNumber() : "");
            map.put("groupName", cs.getGroupName() != null ? cs.getGroupName() : "");
            map.put("firstName", student != null ? student.getFirstName() : "");
            map.put("lastName", student != null ? student.getLastName() : "");
            map.put("email", student != null ? student.getEmail() : "");
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }


    /**
     * Dodaj pojedynczego studenta do kursu
     */
    @PostMapping("/{courseId}/students")
    public ResponseEntity<?> addStudent(@PathVariable Long courseId,
                                        @Valid @RequestBody AddStudentToCourseRequest request,
                                        @AuthenticationPrincipal User teacher) {
        verifyAccess(courseId, teacher);
        
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        
        // Utwórz lub znajdź studenta
        User student = userRepository.findByEmail(request.email())
                .orElseGet(() -> userRepository.save(new User(
                        request.email(),
                        passwordEncoder.encode("student123"),
                        UserRole.STUDENT,
                        request.firstName(),
                        request.lastName()
                )));
        
        // Sprawdź czy już przypisany
        boolean exists = courseStudentRepository.findByCourseId(courseId).stream()
                .anyMatch(cs -> cs.getStudentId().equals(student.getId()));
        
        if (exists) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student już przypisany do kursu"));
        }
        
        courseStudentRepository.save(new CourseStudent(
                course, 
                student.getId(), 
                request.groupName(), 
                request.albumNumber()
        ));
        
        return ResponseEntity.ok(Map.of("status", "added", "studentId", student.getId()));
    }

    /**
     * Usuń studenta z kursu
     */
    @DeleteMapping("/{courseId}/students/{courseStudentId}")
    public ResponseEntity<?> removeStudent(@PathVariable Long courseId,
                                           @PathVariable Long courseStudentId,
                                           @AuthenticationPrincipal User teacher) {
        verifyAccess(courseId, teacher);
        
        ClassGroupStudent cs = courseStudentRepository.findById(courseStudentId)
                .orElseThrow(() -> new IllegalArgumentException("Student assignment not found"));
        
        if (!cs.getClassGroup().getId().equals(courseId)) {
            throw new IllegalArgumentException("Student not in this course");
        }
        
        courseStudentRepository.delete(cs);
        return ResponseEntity.ok(Map.of("status", "removed"));
    }

    /**
     * Import CSV studentów
     */
    @PostMapping("/{courseId}/students/import-csv")
    public ResponseEntity<List<Map<String, String>>> importCsv(@PathVariable Long courseId,
                                                               @RequestBody String csv,
                                                               @AuthenticationPrincipal User teacher) {
        verifyAccess(courseId, teacher);
        
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        
        String[] lines = csv.split("\\r?\\n");
        List<Map<String, String>> results = new java.util.ArrayList<>();
        
        for (int i = 1; i < lines.length; i++) { // skip header
            if (lines[i].isBlank()) continue;
            String[] parts = lines[i].split(",", -1);
            
            if (parts.length < 5) {
                results.add(Map.of(
                    "line", String.valueOf(i + 1),
                    "status", "error",
                    "message", "Za mało kolumn (potrzeba 5: albumNumber,firstName,lastName,groupName,email)"
                ));
                continue;
            }
            
            String album = parts[0].trim();
            String first = parts[1].trim();
            String last = parts[2].trim();
            String group = parts[3].trim();
            String email = parts[4].trim();
            
            try {
                User student = userRepository.findByEmail(email)
                        .orElseGet(() -> userRepository.save(new User(
                                email,
                                passwordEncoder.encode("student123"),
                                UserRole.STUDENT,
                                first,
                                last
                        )));
                
                // Sprawdź czy już przypisany
                boolean exists = courseStudentRepository.findByCourseId(courseId).stream()
                        .anyMatch(cs -> cs.getStudentId().equals(student.getId()));
                
                if (!exists) {
                    courseStudentRepository.save(new CourseStudent(course, student.getId(), group, album));
                    results.add(Map.of(
                        "line", String.valueOf(i + 1),
                        "albumNumber", album,
                        "status", "ok"
                    ));
                } else {
                    results.add(Map.of(
                        "line", String.valueOf(i + 1),
                        "albumNumber", album,
                        "status", "skipped",
                        "message", "Już przypisany"
                    ));
                }
            } catch (Exception ex) {
                results.add(Map.of(
                    "line", String.valueOf(i + 1),
                    "albumNumber", album,
                    "status", "error",
                    "message", ex.getMessage()
                ));
            }
        }
        
        return ResponseEntity.ok(results);
    }

    /**
     * Generuje testowych studentów (dla celów testowych)
     */
    @PostMapping("/{courseId}/students/generate-test")
    public ResponseEntity<Map<String, Object>> generateTestStudents(@PathVariable Long courseId,
                                                                     @RequestParam(defaultValue = "9") int count,
                                                                     @AuthenticationPrincipal User teacher) {
        verifyAccess(courseId, teacher);
        
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        
        String[] firstNames = {"Jan", "Anna", "Piotr", "Maria", "Tomasz", "Katarzyna", "Michał", "Agnieszka", "Krzysztof"};
        String[] lastNames = {"Kowalski", "Nowak", "Wiśniewski", "Wójcik", "Kamiński", "Lewandowski", "Zieliński", "Szymański", "Woźniak"};
        String[] groups = {"Grupa1", "Grupa2", "Grupa3"};
        
        int created = 0;
        int skipped = 0;
        
        for (int i = 0; i < Math.min(count, 20); i++) {
            String firstName = firstNames[i % firstNames.length];
            String lastName = lastNames[i % lastNames.length];
            String email = String.format("test.student%d@example.com", i + 1);
            String albumNumber = String.format("T%03d", i + 1);
            String group = groups[i % groups.length];
            
            try {
                User existingStudent = userRepository.findByEmail(email).orElse(null);
                if (existingStudent != null) {
                    boolean alreadyInCourse = courseStudentRepository.findByCourseId(courseId).stream()
                            .anyMatch(cs -> cs.getStudentId().equals(existingStudent.getId()));
                    if (alreadyInCourse) {
                        skipped++;
                        continue;
                    }
                }
                
                User student = userRepository.findByEmail(email)
                        .orElseGet(() -> userRepository.save(new User(
                                email,
                                passwordEncoder.encode("student123"),
                                UserRole.STUDENT,
                                firstName,
                                lastName
                        )));
                
                courseStudentRepository.save(new CourseStudent(course, student.getId(), group, albumNumber));
                created++;
            } catch (Exception ex) {
                // Ignoruj i kontynuuj
            }
        }
        
        return ResponseEntity.ok(Map.of(
            "status", "success",
            "created", created,
            "skipped", skipped,
            "message", String.format("Utworzono %d testowych studentów (%d pominięto)", created, skipped)
        ));
    }
    
    private void verifyAccess(Long courseId, User teacher) {
        boolean hasAccess = courseTeacherRepository.findByTeacherId(teacher.getId()).stream()
                .anyMatch(ct -> ct.getClassGroup().getId().equals(courseId));
        
        if (!hasAccess) {
            throw new org.springframework.security.access.AccessDeniedException(
                "Nie masz dostępu do tego kursu");
        }
    }
}
