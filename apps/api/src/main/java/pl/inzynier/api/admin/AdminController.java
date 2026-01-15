package pl.inzynier.api.admin;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import java.io.InputStreamReader;
import java.io.IOException;
import pl.inzynier.api.admin.dto.AssignTeacherRequest;
import pl.inzynier.api.admin.dto.CreateCourseRequest;
import pl.inzynier.api.admin.dto.CreateUserRequest;
import pl.inzynier.api.admin.dto.ImportStudentRow;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.audit.AuditEventType;
import pl.inzynier.api.course.*;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;
import pl.inzynier.api.user.UserRole;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CourseRepository courseRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final CourseStudentRepository courseStudentRepository;
    private final AuditService auditService;

    public AdminController(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           CourseRepository courseRepository,
                           CourseTeacherRepository courseTeacherRepository,
                           CourseStudentRepository courseStudentRepository,
                           AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.courseRepository = courseRepository;
        this.courseTeacherRepository = courseTeacherRepository;
        this.courseStudentRepository = courseStudentRepository;
        this.auditService = auditService;
    }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = new User(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.role(),
                request.firstName(),
                request.lastName()
        );
        User saved = userRepository.save(user);
        auditService.log("USER_CREATED", null, "{\"email\":\"" + saved.getEmail() + "\"}");
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/courses")
    public ResponseEntity<ClassGroup> createCourse(@Valid @RequestBody CreateCourseRequest request) {
        ClassGroup course = new ClassGroup(request.name());
        ClassGroup saved = courseRepository.save(course);
        auditService.log("COURSE_CREATED", null, "{\"courseId\":" + saved.getId() + "}");
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/courses/{courseId}/assign-teacher")
    public ResponseEntity<?> assignTeacher(@PathVariable Long courseId,
                                           @Valid @RequestBody AssignTeacherRequest request) {
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        courseTeacherRepository.save(new ClassGroupTeacher(course, request.teacherId()));
        auditService.log("COURSE_ASSIGN_TEACHER", null, "{\"courseId\":" + courseId + ",\"teacherId\":" + request.teacherId() + "}");
        return ResponseEntity.ok(Map.of("status", "assigned"));
    }

    @PostMapping("/courses/{courseId}/students/import")
    public ResponseEntity<?> importStudents(@PathVariable Long courseId, @RequestBody List<ImportStudentRow> rows) {
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        List<Map<String, String>> results = new ArrayList<>();
        for (ImportStudentRow row : rows) {
            try {
                String password = row.email() != null ? "student123" : UUID.randomUUID().toString();
                User student = userRepository.findByEmail(row.email())
                        .orElseGet(() -> userRepository.save(new User(
                                row.email(),
                                passwordEncoder.encode(password),
                                UserRole.STUDENT,
                                row.firstName(),
                                row.lastName()
                        )));
                courseStudentRepository.save(new CourseStudent(course, student.getId(), row.groupName(), row.albumNumber()));
                results.add(Map.of("albumNumber", row.albumNumber(), "status", "ok"));
            } catch (Exception ex) {
                results.add(Map.of("albumNumber", row.albumNumber(), "status", "error", "message", ex.getMessage()));
            }
        }
        auditService.log("COURSE_IMPORT_STUDENTS", null, "{\"courseId\":" + courseId + ",\"count\":" + rows.size() + "}");
        return ResponseEntity.ok(results);
    }

    /**
     * Import studentów z pliku CSV z pełną walidacją.
     */
    @PostMapping("/courses/{courseId}/students/import-csv")
    public ResponseEntity<?> importStudentsCsv(@PathVariable Long courseId,
                                               @RequestParam("file") MultipartFile file,
                                               @AuthenticationPrincipal User admin) throws IOException, CsvValidationException {
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));

        List<Map<String, Object>> errors = new ArrayList<>();
        List<ParsedCsvRow> validRows = new ArrayList<>();
        Set<String> seenAlbums = new HashSet<>();
        Set<String> existingAlbums = courseStudentRepository.findByCourseId(courseId).stream()
                .map(ClassGroupStudent::getAlbumNumber)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());

        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            String[] row;
            int rowNum = 0;
            boolean headerChecked = false;
            while ((row = reader.readNext()) != null) {
                rowNum++;
                // Pomiń pusty wiersz
                if (row.length == 0 || (row.length == 1 && row[0].isBlank())) {
                    continue;
                }

                if (!headerChecked) {
                    headerChecked = true;
                    String header = String.join(",", row).toLowerCase();
                    if (header.contains("nr_albumu") && header.contains("imie") && header.contains("nazwisko")) {
                        continue; // to nagłówek
                    }
                }

                if (row.length < 4) {
                    errors.add(Map.of("row", rowNum, "error", "Nieprawidłowa liczba kolumn (wymagane 4)"));
                    continue;
                }

                String album = row[0].trim();
                String first = row[1].trim();
                String last = row[2].trim();
                String groupName = row[3].trim();

                if (album.isEmpty()) {
                    errors.add(Map.of("row", rowNum, "error", "Brak numeru albumu"));
                    continue;
                }
                if (first.isEmpty()) {
                    errors.add(Map.of("row", rowNum, "error", "Brak imienia"));
                    continue;
                }
                if (last.isEmpty()) {
                    errors.add(Map.of("row", rowNum, "error", "Brak nazwiska"));
                    continue;
                }
                if (!seenAlbums.add(album)) {
                    errors.add(Map.of("row", rowNum, "error", "Duplikat numeru albumu w pliku: " + album));
                    continue;
                }
                if (existingAlbums.contains(album)) {
                    errors.add(Map.of("row", rowNum, "error", "Duplikat numeru albumu w bazie: " + album));
                    continue;
                }

                validRows.add(new ParsedCsvRow(album, first, last, groupName));
            }
        }

        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "errors", errors
            ));
        }

        for (ParsedCsvRow row : validRows) {
            String email = row.albumNumber() + "@students.local";
            User student = userRepository.findByEmail(email)
                    .orElseGet(() -> userRepository.save(new User(
                            email,
                            passwordEncoder.encode("student123"),
                            UserRole.STUDENT,
                            row.firstName(),
                            row.lastName()
                    )));
            courseStudentRepository.save(new CourseStudent(course, student.getId(), row.groupName(), row.albumNumber()));
        }

        auditService.log(
                AuditEventType.STUDENTS_IMPORTED,
                admin != null ? admin.getId() : null,
                String.format("{\"courseId\":%d,\"count\":%d,\"errors\":0}", courseId, validRows.size())
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "count", validRows.size()
        ));
    }

    private record ParsedCsvRow(String albumNumber, String firstName, String lastName, String groupName) {}

    @GetMapping("/courses")
    public List<ClassGroup> listCourses() {
        return courseRepository.findAll();
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> listUsers(@RequestParam(required = false) UserRole role) {
        List<User> users = role != null 
            ? userRepository.findByRole(role) 
            : userRepository.findAll();
        
        List<Map<String, Object>> result = users.stream()
            .map(u -> Map.<String, Object>of(
                "id", u.getId(),
                "email", u.getEmail(),
                "firstName", u.getFirstName(),
                "lastName", u.getLastName(),
                "role", u.getRole().name()
            ))
            .toList();
        
        return ResponseEntity.ok(result);
    }
    // GET /api/admin/users/students-with-groups
    @GetMapping("/users/students-with-groups")
    public ResponseEntity<List<Map<String, Object>>> getStudentsWithGroups() {
        List<User> students = userRepository.findByRole(UserRole.STUDENT);
        List<Map<String, Object>> result = new ArrayList<>();

        for (User student : students) {
            // Znajdź przypisanie do grupy
            ClassGroupStudent courseStudent = courseStudentRepository
                    .findByStudentId(student.getId())
                    .stream()
                    .findFirst()
                    .orElse(null);

            Map<String, Object> data = new HashMap<>();
            data.put("id", student.getId());
            data.put("firstName", student.getFirstName());
            data.put("lastName", student.getLastName());
            data.put("email", student.getEmail());
            data.put("albumNumber", courseStudent != null ? courseStudent.getAlbumNumber() : null);
            data.put("groupName", courseStudent != null ? courseStudent.getClassGroup().getName() : null);
            data.put("groupId", courseStudent != null ? courseStudent.getClassGroup().getId() : null);

            result.add(data);
        }

        return ResponseEntity.ok(result);
    }

    // POST /api/admin/courses/{courseId}/students/assign-existing
    @PostMapping("/courses/{courseId}/students/assign-existing")
    public ResponseEntity<Map<String, String>> assignExistingStudent(
            @PathVariable Long courseId,
            @RequestBody Map<String, Object> request) {

        Long studentId = Long.valueOf(request.get("studentId").toString());
        String albumNumber = request.get("albumNumber").toString();
        String groupName = request.getOrDefault("groupName", "").toString();

        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        // Usuń stare przypisanie jeśli istnieje
        courseStudentRepository.findByStudentId(studentId)
                .forEach(cs -> courseStudentRepository.delete(cs));

        // Nowe przypisanie
        courseStudentRepository.save(new CourseStudent(course, studentId, groupName, albumNumber));

        auditService.log("COURSE_ASSIGN_STUDENT", null,
                "{\"courseId\":" + courseId + ",\"studentId\":" + studentId + "}");

        return ResponseEntity.ok(Map.of("status", "assigned"));
    }

    /**
     * Generuje i przypisuje testowych studentów do kursu (dla celów testowych)
     */
    @PostMapping("/courses/{courseId}/students/generate-test")
    public ResponseEntity<Map<String, Object>> generateTestStudents(@PathVariable Long courseId,
                                                                     @RequestParam(defaultValue = "9") int count) {
        ClassGroup course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        
        String[] firstNames = {"Jan", "Anna", "Piotr", "Maria", "Tomasz", "Katarzyna", "Michał", "Agnieszka", "Krzysztof"};
        String[] lastNames = {"Kowalski", "Nowak", "Wiśniewski", "Wójcik", "Kamiński", "Lewandowski", "Zieliński", "Szymański", "Woźniak"};
        String[] groups = {"Grupa1", "Grupa2", "Grupa3"};
        
        int created = 0;
        int skipped = 0;
        
        for (int i = 0; i < Math.min(count, 20); i++) { // max 20 na raz
            String firstName = firstNames[i % firstNames.length];
            String lastName = lastNames[i % lastNames.length];
            String email = String.format("test.student%d@example.com", i + 1);
            String albumNumber = String.format("T%03d", i + 1);
            String group = groups[i % groups.length];
            
            try {
                // Sprawdź czy student już istnieje w kursie
                User existingStudent = userRepository.findByEmail(email).orElse(null);
                if (existingStudent != null) {
                    boolean alreadyInCourse = courseStudentRepository.findByCourseId(courseId).stream()
                            .anyMatch(cs -> cs.getStudentId().equals(existingStudent.getId()));
                    if (alreadyInCourse) {
                        skipped++;
                        continue;
                    }
                }
                
                // Utwórz lub pobierz studenta
                User student = userRepository.findByEmail(email)
                        .orElseGet(() -> userRepository.save(new User(
                                email,
                                passwordEncoder.encode("student123"),
                                UserRole.STUDENT,
                                firstName,
                                lastName
                        )));
                
                // Przypisz do kursu
                courseStudentRepository.save(new CourseStudent(course, student.getId(), group, albumNumber));
                created++;
            } catch (Exception ex) {
                // Ignoruj błędy i kontynuuj
            }
        }
        
        auditService.log("COURSE_GENERATE_TEST_STUDENTS", null, 
            String.format("{\"courseId\":%d,\"created\":%d,\"skipped\":%d}", courseId, created, skipped));
        
        return ResponseEntity.ok(Map.of(
            "status", "success",
            "created", created,
            "skipped", skipped,
            "message", String.format("Utworzono %d testowych studentów (%d pominięto - już w kursie)", created, skipped)
        ));
    }
}

