package pl.inzynier.api.teacher;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pl.inzynier.api.course.*;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/teacher/class-groups")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherClassGroupController {

    private final ClassGroupRepository classGroupRepository;
    private final ClassGroupTeacherRepository classGroupTeacherRepository;
    private final ClassGroupStudentRepository classGroupStudentRepository;
    private final UserRepository userRepository;

    public TeacherClassGroupController(
            ClassGroupRepository classGroupRepository,
            ClassGroupTeacherRepository classGroupTeacherRepository,
            ClassGroupStudentRepository classGroupStudentRepository,
            UserRepository userRepository) {
        this.classGroupRepository = classGroupRepository;
        this.classGroupTeacherRepository = classGroupTeacherRepository;
        this.classGroupStudentRepository = classGroupStudentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getMyClassGroups(@AuthenticationPrincipal User teacher) {
        List<ClassGroupTeacher> myGroups = classGroupTeacherRepository.findByTeacherId(teacher.getId());
        
        List<Map<String, Object>> result = myGroups.stream().map(cgt -> {
            ClassGroup group = classGroupRepository.findById(cgt.getClassGroup().getId())
                .orElse(null);
            if (group == null) return null;
            
            long studentCount = classGroupStudentRepository.findByClassGroupId(group.getId()).size();
            
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", group.getId());
            map.put("name", group.getName());
            map.put("createdAt", group.getCreatedAt());
            map.put("studentCount", studentCount);
            return map;
        }).filter(g -> g != null).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getClassGroupDetails(
            @AuthenticationPrincipal User teacher, 
            @PathVariable Long id) {
        
        // Sprawdź czy nauczyciel jest przypisany do tej grupy
        ClassGroupTeacher cgt = classGroupTeacherRepository.findByClassGroupIdAndTeacherId(id, teacher.getId())
            .orElseThrow(() -> new RuntimeException("Nie masz dostępu do tej grupy"));
        
        ClassGroup group = classGroupRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Grupa zajęciowa nie istnieje"));
        
        List<ClassGroupStudent> students = classGroupStudentRepository.findByClassGroupId(id);
        
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
            "students", studentDetails
        ));
    }

    @GetMapping("/{id}/students")
    public ResponseEntity<?> getClassGroupStudents(
            @AuthenticationPrincipal User teacher,
            @PathVariable Long id) {
        
        // Sprawdź czy nauczyciel jest przypisany do tej grupy
        classGroupTeacherRepository.findByClassGroupIdAndTeacherId(id, teacher.getId())
            .orElseThrow(() -> new RuntimeException("Nie masz dostępu do tej grupy"));
        
        List<ClassGroupStudent> students = classGroupStudentRepository.findByClassGroupId(id);
        
        List<Map<String, Object>> result = students.stream().map(cgs -> {
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
        
        return ResponseEntity.ok(result);
    }
}

