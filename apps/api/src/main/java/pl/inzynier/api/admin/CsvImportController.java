package pl.inzynier.api.admin;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.course.*;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;
import pl.inzynier.api.user.UserRole;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
public class CsvImportController {

    private final ClassGroupRepository classGroupRepository;
    private final ClassGroupStudentRepository classGroupStudentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public CsvImportController(ClassGroupRepository classGroupRepository,
                               ClassGroupStudentRepository classGroupStudentRepository,
                               UserRepository userRepository,
                               PasswordEncoder passwordEncoder,
                               AuditService auditService) {
        this.classGroupRepository = classGroupRepository;
        this.classGroupStudentRepository = classGroupStudentRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @PostMapping(path = "/class-groups/{groupId}/students/import-csv", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<List<Map<String, String>>> importCsv(@PathVariable Long groupId,
                                                               @RequestBody byte[] csvBytes) {
        ClassGroup classGroup = classGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Grupa zajęciowa nie istnieje"));
        
        String csv = new String(csvBytes, StandardCharsets.UTF_8);
        String[] lines = csv.split("\\r?\\n");
        List<Map<String, String>> results = new ArrayList<>();
        
        for (int i = 1; i < lines.length; i++) { // skip header
            if (lines[i].isBlank()) continue;
            String[] parts = lines[i].split(",", -1);
            if (parts.length < 4) {
                results.add(Map.of(
                    "line", String.valueOf(i + 1), 
                    "status", "error", 
                    "message", "Nieprawidłowa liczba kolumn (wymagane: albumNumber,firstName,lastName,email)"));
                continue;
            }
            
            String albumNumber = parts[0].trim();
            String firstName = parts[1].trim();
            String lastName = parts[2].trim();
            String email = parts[3].trim();
            
            try {
                // Sprawdź czy student już istnieje
                User student = userRepository.findByEmail(email).orElse(null);
                
                if (student == null) {
                    // Utwórz nowego studenta
                    String password = "student123"; // domyślne hasło
                    student = new User(email, passwordEncoder.encode(password), UserRole.STUDENT, firstName, lastName, albumNumber);
                    student.setClassGroup(classGroup);
                    student = userRepository.save(student);
                } else {
                    // Zaktualizuj istniejącego studenta
                    if (student.getRole() != UserRole.STUDENT) {
                        results.add(Map.of(
                            "line", String.valueOf(i + 1), 
                            "albumNumber", albumNumber, 
                            "status", "error", 
                            "message", "Użytkownik nie jest studentem"));
                        continue;
                    }
                    
                    // Usuń poprzednie przypisanie
                    classGroupStudentRepository.findByStudentId(student.getId())
                        .forEach(cgs -> classGroupStudentRepository.delete(cgs));
                    
                    student.setAlbumNumber(albumNumber);
                    student.setClassGroup(classGroup);
                    userRepository.save(student);
                }
                
                // Dodaj relację student-grupa
                if (classGroupStudentRepository.findByClassGroupIdAndStudentId(groupId, student.getId()).isEmpty()) {
                    ClassGroupStudent cgs = new ClassGroupStudent(classGroup, student.getId());
                    classGroupStudentRepository.save(cgs);
                }
                
                results.add(Map.of(
                    "line", String.valueOf(i + 1), 
                    "albumNumber", albumNumber, 
                    "email", email,
                    "status", "ok"));
                    
            } catch (Exception ex) {
                results.add(Map.of(
                    "line", String.valueOf(i + 1), 
                    "albumNumber", albumNumber, 
                    "status", "error", 
                    "message", ex.getMessage()));
            }
        }
        
        auditService.log("CLASS_GROUP_IMPORT_STUDENTS_CSV", 
            "Zaimportowano studentów do grupy: " + classGroup.getName() + 
            " {\"groupId\":" + groupId + ",\"count\":" + (lines.length - 1) + "}");
            
        return ResponseEntity.ok(results);
    }
    
    // Backward compatibility
    @Deprecated
    @PostMapping(path = "/courses/{courseId}/students/import-csv", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<List<Map<String, String>>> importCsvLegacy(@PathVariable Long courseId,
                                                                     @RequestBody byte[] csvBytes) {
        return importCsv(courseId, csvBytes);
    }
}






