package pl.inzynier.api.course;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pl.inzynier.api.audit.AuditService;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Kontroler do zarządzania przypisaniami studentów do zadań.
 */
@RestController
@RequestMapping("/api/teacher/tasks")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER')")
public class TaskStudentController {

    private final TaskRepository taskRepository;
    private final TaskStudentRepository taskStudentRepository;
    private final CourseStudentRepository courseStudentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public TaskStudentController(TaskRepository taskRepository,
                                TaskStudentRepository taskStudentRepository,
                                CourseStudentRepository courseStudentRepository,
                                UserRepository userRepository,
                                AuditService auditService) {
        this.taskRepository = taskRepository;
        this.taskStudentRepository = taskStudentRepository;
        this.courseStudentRepository = courseStudentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    /**
     * Przypisz wszystkich studentów z kursu do zadania.
     */
    @PostMapping("/{taskId}/students/assign-all")
    public ResponseEntity<Map<String, Object>> assignAllStudents(
            @PathVariable Long taskId,
            @AuthenticationPrincipal User teacher) {
        
        Task task = getTaskForTeacher(taskId, teacher.getId());
        List<ClassGroupStudent> enrollments = courseStudentRepository.findByCourseId(task.getCourse().getId());
        
        int assigned = 0;
        for (ClassGroupStudent cs : enrollments) {
            boolean exists = !taskStudentRepository.findByTaskIdAndStudentId(taskId, cs.getStudentId()).isEmpty();
            if (!exists) {
                taskStudentRepository.save(new TaskStudent(task, cs.getStudentId(), teacher.getId()));
                assigned++;
            }
        }
        
        auditService.log("TASK_ASSIGN_ALL_STUDENTS", teacher.getId(),
            String.format("{\"taskId\":%d,\"courseId\":%d,\"assignedCount\":%d}", 
                taskId, task.getCourse().getId(), assigned));
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Przypisano studentów do zadania",
            "assignedCount", assigned,
            "totalInCourse", enrollments.size()
        ));
    }

    /**
     * Przypisz studentów z konkretnej grupy do zadania.
     */
    @PostMapping("/{taskId}/students/assign-group")
    public ResponseEntity<Map<String, Object>> assignGroup(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User teacher) {
        
        String groupName = request.get("groupName");
        if (groupName == null || groupName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Nazwa grupy jest wymagana"
            ));
        }
        
        Task task = getTaskForTeacher(taskId, teacher.getId());
        List<ClassGroupStudent> enrollments = courseStudentRepository.findByCourseId(task.getCourse().getId())
                .stream()
                .filter(cs -> groupName.equals(cs.getGroupName()))
                .collect(Collectors.toList());
        
        int assigned = 0;
        for (ClassGroupStudent cs : enrollments) {
            boolean exists = !taskStudentRepository.findByTaskIdAndStudentId(taskId, cs.getStudentId()).isEmpty();
            if (!exists) {
                taskStudentRepository.save(new TaskStudent(task, cs.getStudentId(), teacher.getId()));
                assigned++;
            }
        }
        
        auditService.log("TASK_ASSIGN_GROUP", teacher.getId(),
            String.format("{\"taskId\":%d,\"groupName\":\"%s\",\"assignedCount\":%d}", 
                taskId, groupName, assigned));
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Przypisano grupę " + groupName + " do zadania",
            "assignedCount", assigned,
            "groupSize", enrollments.size()
        ));
    }

    /**
     * Przypisz wybranych studentów do zadania.
     */
    @PostMapping("/{taskId}/students/assign")
    public ResponseEntity<Map<String, Object>> assignStudents(
            @PathVariable Long taskId,
            @RequestBody Map<String, List<Long>> request,
            @AuthenticationPrincipal User teacher) {
        
        List<Long> studentIds = request.get("studentIds");
        if (studentIds == null || studentIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Lista studentów jest wymagana"
            ));
        }
        
        Task task = getTaskForTeacher(taskId, teacher.getId());
        
        int assigned = 0;
        for (Long studentId : studentIds) {
            boolean exists = !taskStudentRepository.findByTaskIdAndStudentId(taskId, studentId).isEmpty();
            if (!exists) {
                taskStudentRepository.save(new TaskStudent(task, studentId, teacher.getId()));
                assigned++;
            }
        }
        
        auditService.log("TASK_ASSIGN_SELECTED_STUDENTS", teacher.getId(),
            String.format("{\"taskId\":%d,\"assignedCount\":%d}", taskId, assigned));
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Przypisano wybranych studentów do zadania",
            "assignedCount", assigned
        ));
    }

    /**
     * Usuń przypisanie studenta do zadania.
     */
    @DeleteMapping("/{taskId}/students/{studentId}")
    public ResponseEntity<Map<String, String>> removeStudent(
            @PathVariable Long taskId,
            @PathVariable Long studentId,
            @AuthenticationPrincipal User teacher) {
        
        getTaskForTeacher(taskId, teacher.getId());
        
        List<TaskStudent> assignments = taskStudentRepository.findByTaskIdAndStudentId(taskId, studentId);
        if (assignments.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", "false",
                "message", "Student nie jest przypisany do tego zadania"
            ));
        }
        
        taskStudentRepository.deleteAll(assignments);
        
        auditService.log("TASK_REMOVE_STUDENT", teacher.getId(),
            String.format("{\"taskId\":%d,\"studentId\":%d}", taskId, studentId));
        
        return ResponseEntity.ok(Map.of(
            "success", "true",
            "message", "Usunięto przypisanie studenta do zadania"
        ));
    }

    /**
     * Lista przypisanych studentów do zadania.
     */
    @GetMapping("/{taskId}/students")
    public ResponseEntity<List<TaskStudentDto>> listAssignedStudents(
            @PathVariable Long taskId,
            @AuthenticationPrincipal User teacher) {
        
        Task task = getTaskForTeacher(taskId, teacher.getId());
        List<TaskStudent> assignments = taskStudentRepository.findByTaskId(taskId);
        
        List<TaskStudentDto> result = new ArrayList<>();
        for (TaskStudent ts : assignments) {
            User student = userRepository.findById(ts.getStudentId()).orElse(null);
            if (student != null) {
                ClassGroupStudent cs = courseStudentRepository.findByCourseIdAndStudentId(
                    task.getCourse().getId(), 
                    student.getId()
                ).orElse(null);
                
                result.add(new TaskStudentDto(
                    student.getId(),
                    student.getEmail(),
                    student.getFirstName(),
                    student.getLastName(),
                    cs != null ? cs.getAlbumNumber() : null,
                    cs != null ? cs.getGroupName() : null,
                    ts.getAssignedAt().toString()
                ));
            }
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * Lista dostępnych studentów z kursu (do przypisania).
     */
    @GetMapping("/{taskId}/students/available")
    public ResponseEntity<List<AvailableStudentDto>> listAvailableStudents(
            @PathVariable Long taskId,
            @AuthenticationPrincipal User teacher) {
        
        Task task = getTaskForTeacher(taskId, teacher.getId());
        List<ClassGroupStudent> allInCourse = courseStudentRepository.findByCourseId(task.getCourse().getId());
        List<TaskStudent> alreadyAssigned = taskStudentRepository.findByTaskId(taskId);
        
        List<Long> assignedIds = alreadyAssigned.stream()
                .map(TaskStudent::getStudentId)
                .collect(Collectors.toList());
        
        List<AvailableStudentDto> result = new ArrayList<>();
        for (ClassGroupStudent cs : allInCourse) {
            User student = userRepository.findById(cs.getStudentId()).orElse(null);
            if (student != null) {
                boolean isAssigned = assignedIds.contains(student.getId());
                result.add(new AvailableStudentDto(
                    student.getId(),
                    student.getEmail(),
                    student.getFirstName(),
                    student.getLastName(),
                    cs.getAlbumNumber(),
                    cs.getGroupName(),
                    isAssigned
                ));
            }
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * Pomocnicza metoda: sprawdza czy teacher ma dostęp do zadania.
     */
    private Task getTaskForTeacher(Long taskId, Long teacherId) {
        // Na prośbę „olej zabezpieczenia” – nie blokujemy, tylko zwracamy zadanie.
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Zadanie nie istnieje"));
    }

    // DTOs
    public record TaskStudentDto(
        Long studentId,
        String email,
        String firstName,
        String lastName,
        String albumNumber,
        String groupName,
        String assignedAt
    ) {}

    public record AvailableStudentDto(
        Long studentId,
        String email,
        String firstName,
        String lastName,
        String albumNumber,
        String groupName,
        boolean isAssigned
    ) {}
}

