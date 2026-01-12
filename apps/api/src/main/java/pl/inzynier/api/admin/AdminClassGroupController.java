package pl.inzynier.api.admin;

import org.springframework.http.ResponseEntity;
import jakarta.annotation.security.PermitAll;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pl.inzynier.api.admin.dto.*;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.course.*;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;
import pl.inzynier.api.user.UserRole;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;

@RestController
@RequestMapping("/api/admin/class-groups")
public class AdminClassGroupController {

    private final ClassGroupRepository classGroupRepository;
    private final ClassGroupTeacherRepository classGroupTeacherRepository;
    private final ClassGroupStudentRepository classGroupStudentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AdminClassGroupController(
            ClassGroupRepository classGroupRepository,
            ClassGroupTeacherRepository classGroupTeacherRepository,
            ClassGroupStudentRepository classGroupStudentRepository,
            UserRepository userRepository,
            AuditService auditService) {
        this.classGroupRepository = classGroupRepository;
        this.classGroupTeacherRepository = classGroupTeacherRepository;
        this.classGroupStudentRepository = classGroupStudentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    private void verifyTeacherAccess(User requester, Long groupId) {
        if (requester == null) {
            throw new AccessDeniedException("Brak autoryzacji");
        }
        if (requester.getRole() == UserRole.ADMIN) {
            return;
        }
        if (requester.getRole() == UserRole.TEACHER) {
            boolean hasAccess = classGroupTeacherRepository.findByClassGroupIdAndTeacherId(groupId, requester.getId()).isPresent();
            if (!hasAccess) {
                throw new AccessDeniedException("Brak dostępu do grupy");
            }
        } else {
            throw new AccessDeniedException("Brak uprawnień");
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createClassGroup(@RequestBody CreateClassGroupRequest request) {
        if (classGroupRepository.findByName(request.name()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Grupa zajęciowa o tej nazwie już istnieje"));
        }

        ClassGroup classGroup = new ClassGroup(request.name());
        classGroup = classGroupRepository.save(classGroup);

        auditService.log("CREATE_CLASS_GROUP", "Utworzono grupę zajęciową: " + request.name());
        
        return ResponseEntity.ok(Map.of(
            "id", classGroup.getId(),
            "name", classGroup.getName(),
            "createdAt", classGroup.getCreatedAt()
        ));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllClassGroups() {
        List<ClassGroup> groups = classGroupRepository.findAll();
        
        List<Map<String, Object>> result = groups.stream().map(group -> {
            long teacherCount = classGroupTeacherRepository.findByClassGroupId(group.getId()).size();
            long studentCount = classGroupStudentRepository.findByClassGroupId(group.getId()).size();
            
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", group.getId());
            map.put("name", group.getName());
            map.put("createdAt", group.getCreatedAt());
            map.put("teacherCount", teacherCount);
            map.put("studentCount", studentCount);
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getClassGroupDetails(@PathVariable Long id) {
        ClassGroup group = classGroupRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Grupa zajęciowa nie istnieje"));
        
        List<ClassGroupTeacher> teachers = classGroupTeacherRepository.findByClassGroupId(id);
        List<ClassGroupStudent> students = classGroupStudentRepository.findByClassGroupId(id);
        
        List<Map<String, Object>> teacherDetails = teachers.stream().map(cgt -> {
            User teacher = userRepository.findById(cgt.getTeacherId()).orElse(null);
            if (teacher == null) return null;
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", teacher.getId());
            map.put("email", teacher.getEmail());
            map.put("firstName", teacher.getFirstName());
            map.put("lastName", teacher.getLastName());
            return map;
        }).filter(t -> t != null).collect(Collectors.toList());
        
        List<Map<String, Object>> studentDetails = students.stream().map(cgs -> {
            User student = userRepository.findById(cgs.getStudentId()).orElse(null);
            if (student == null) return null;
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", student.getId());
            map.put("email", student.getEmail());
            map.put("firstName", student.getFirstName());
            map.put("lastName", student.getLastName());
            map.put("albumNumber", student.getAlbumNumber() != null ? student.getAlbumNumber() : "");
            return map;
        }).filter(s -> s != null).collect(Collectors.toList());
        
        return ResponseEntity.ok(Map.of(
            "id", group.getId(),
            "name", group.getName(),
            "createdAt", group.getCreatedAt(),
            "teachers", teacherDetails,
            "students", studentDetails
        ));
    }

    @PostMapping("/{groupId}/teachers/{teacherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignTeacher(@PathVariable Long groupId, @PathVariable Long teacherId) {
        ClassGroup group = classGroupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Grupa zajęciowa nie istnieje"));
        
        User teacher = userRepository.findById(teacherId)
            .orElseThrow(() -> new RuntimeException("Nauczyciel nie istnieje"));
        
        if (teacher.getRole() != UserRole.TEACHER) {
            return ResponseEntity.badRequest().body(Map.of("error", "Użytkownik nie jest nauczycielem"));
        }
        
        if (classGroupTeacherRepository.findByClassGroupIdAndTeacherId(groupId, teacherId).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nauczyciel już jest przypisany do tej grupy"));
        }
        
        ClassGroupTeacher cgt = new ClassGroupTeacher(group, teacherId);
        classGroupTeacherRepository.save(cgt);
        
        auditService.log("ASSIGN_TEACHER_TO_GROUP", 
            "Przypisano nauczyciela " + teacher.getEmail() + " do grupy " + group.getName());
        
        return ResponseEntity.ok(Map.of("message", "Nauczyciel został przypisany do grupy"));
    }

    @DeleteMapping("/{groupId}/teachers/{teacherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeTeacher(@PathVariable Long groupId, @PathVariable Long teacherId) {
        ClassGroupTeacher cgt = classGroupTeacherRepository.findByClassGroupIdAndTeacherId(groupId, teacherId)
            .orElseThrow(() -> new RuntimeException("Nauczyciel nie jest przypisany do tej grupy"));
        
        classGroupTeacherRepository.delete(cgt);
        
        auditService.log("REMOVE_TEACHER_FROM_GROUP", 
            "Usunięto nauczyciela z grupy ID: " + groupId);
        
        return ResponseEntity.ok(Map.of("message", "Nauczyciel został usunięty z grupy"));
    }

    @PostMapping("/{groupId}/students/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<?> assignStudent(
            @PathVariable Long groupId, 
            @PathVariable Long studentId,
            @RequestBody(required = false) AssignStudentRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal User requester) {
        
        ClassGroup group = classGroupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Grupa zajęciowa nie istnieje"));
        
        // Jeśli nauczyciel, musi mieć przypisaną tę grupę
        verifyTeacherAccess(requester, groupId);
        
        User student = userRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student nie istnieje"));
        
        if (student.getRole() != UserRole.STUDENT) {
            return ResponseEntity.badRequest().body(Map.of("error", "Użytkownik nie jest studentem"));
        }
        
        // Usuń poprzednie przypisanie do grupy
        classGroupStudentRepository.findByStudentId(studentId)
            .forEach(cgs -> classGroupStudentRepository.delete(cgs));
        
        // Przypisz do nowej grupy
        student.setClassGroup(group);
        if (request != null && request.albumNumber() != null && !request.albumNumber().isEmpty()) {
            student.setAlbumNumber(request.albumNumber());
        }
        userRepository.save(student);
        
        ClassGroupStudent cgs = new ClassGroupStudent(group, studentId);
        classGroupStudentRepository.save(cgs);
        
        auditService.log("ASSIGN_STUDENT_TO_GROUP", 
            "Przypisano studenta " + student.getEmail() + " do grupy " + group.getName());
        
        return ResponseEntity.ok(Map.of("message", "Student został przypisany do grupy"));
    }

    @DeleteMapping("/{groupId}/students/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<?> removeStudent(@PathVariable Long groupId, @PathVariable Long studentId) {
        ClassGroupStudent cgs = classGroupStudentRepository.findByClassGroupIdAndStudentId(groupId, studentId)
            .orElseThrow(() -> new RuntimeException("Student nie jest przypisany do tej grupy"));
        
        User student = userRepository.findById(studentId).orElse(null);
        if (student != null) {
            student.setClassGroup(null);
            userRepository.save(student);
        }
        
        classGroupStudentRepository.delete(cgs);
        
        auditService.log("REMOVE_STUDENT_FROM_GROUP", 
            "Usunięto studenta z grupy ID: " + groupId);
        
        return ResponseEntity.ok(Map.of("message", "Student został usunięty z grupy"));
    }

    @GetMapping("/available-teachers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAvailableTeachers() {
        List<User> teachers = userRepository.findAll().stream()
            .filter(u -> u.getRole() == UserRole.TEACHER)
            .collect(Collectors.toList());
        
        List<Map<String, Object>> result = teachers.stream().map(teacher -> {
            List<ClassGroupTeacher> groups = classGroupTeacherRepository.findByTeacherId(teacher.getId());
            List<String> groupNames = groups.stream()
                .map(cgt -> {
                    ClassGroup g = classGroupRepository.findById(cgt.getClassGroup().getId()).orElse(null);
                    return g != null ? g.getName() : null;
                })
                .filter(name -> name != null)
                .collect(Collectors.toList());
            
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", teacher.getId());
            map.put("email", teacher.getEmail());
            map.put("firstName", teacher.getFirstName());
            map.put("lastName", teacher.getLastName());
            map.put("groups", groupNames);
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/available-students")
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAvailableStudents() {
        List<Map<String, Object>> result = userRepository.findAll().stream()
            .filter(u -> u.getRole() == UserRole.STUDENT)
            .map(student -> {
                String groupName = "brak grupy";
                if (student.getClassGroup() != null) {
                    groupName = student.getClassGroup().getName();
                }

                Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", student.getId());
                map.put("email", student.getEmail());
                map.put("firstName", student.getFirstName());
                map.put("lastName", student.getLastName());
                map.put("albumNumber", student.getAlbumNumber() != null ? student.getAlbumNumber() : "");
                map.put("group", groupName);
                return map;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateClassGroup(@PathVariable Long id, @RequestBody CreateClassGroupRequest request) {
        ClassGroup group = classGroupRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Grupa zajęciowa nie istnieje"));
        
        if (!group.getName().equals(request.name()) && classGroupRepository.findByName(request.name()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Grupa zajęciowa o tej nazwie już istnieje"));
        }
        
        group.setName(request.name());
        classGroupRepository.save(group);
        
        auditService.log("UPDATE_CLASS_GROUP", "Zaktualizowano grupę zajęciową: " + request.name());
        
        return ResponseEntity.ok(Map.of("message", "Grupa zajęciowa została zaktualizowana"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteClassGroup(@PathVariable Long id) {
        ClassGroup group = classGroupRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Grupa zajęciowa nie istnieje"));
        
        // Usuń wszystkie relacje
        classGroupTeacherRepository.findByClassGroupId(id).forEach(classGroupTeacherRepository::delete);
        classGroupStudentRepository.findByClassGroupId(id).forEach(cgs -> {
            User student = userRepository.findById(cgs.getStudentId()).orElse(null);
            if (student != null) {
                student.setClassGroup(null);
                userRepository.save(student);
            }
            classGroupStudentRepository.delete(cgs);
        });
        
        classGroupRepository.delete(group);
        
        auditService.log("DELETE_CLASS_GROUP", "Usunięto grupę zajęciową: " + group.getName());
        
        return ResponseEntity.ok(Map.of("message", "Grupa zajęciowa została usunięta"));
    }
}

