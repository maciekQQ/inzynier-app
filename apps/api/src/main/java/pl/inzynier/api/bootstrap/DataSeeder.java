package pl.inzynier.api.bootstrap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import pl.inzynier.api.course.*;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;
import pl.inzynier.api.user.UserRole;

import java.time.Instant;
import java.util.List;

@Component
public class DataSeeder {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CourseRepository courseRepository;
    private final TaskRepository taskRepository;
    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final CourseStudentRepository courseStudentRepository;
    private final String adminPassword;

    public DataSeeder(UserRepository userRepository,
                      PasswordEncoder passwordEncoder,
                      CourseRepository courseRepository,
                      TaskRepository taskRepository,
                      StageRepository stageRepository,
                      ArtifactRepository artifactRepository,
                      CourseTeacherRepository courseTeacherRepository,
                      CourseStudentRepository courseStudentRepository,
                      @Value("${app.bootstrap.admin-password:admin123}") String adminPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.courseRepository = courseRepository;
        this.taskRepository = taskRepository;
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
        this.courseTeacherRepository = courseTeacherRepository;
        this.courseStudentRepository = courseStudentRepository;
        this.adminPassword = adminPassword;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seedDefaultAdmin() {
        ensureUser("admin@example.com", adminPassword, UserRole.ADMIN, "Admin", "User");
        ensureUser("teacher@example.com", "teacher123", UserRole.TEACHER, "Anna", "Teacher");
        ensureUser("s1@example.com", "student123", UserRole.STUDENT, "Jan", "Student1");
        ensureUser("s2@example.com", "student123", UserRole.STUDENT, "Ala", "Student2");
        ensureUser("s3@example.com", "student123", UserRole.STUDENT, "Ola", "Student3");

        if (courseRepository.count() == 0) {
            User teacher = userRepository.findByEmail("teacher@example.com").orElseThrow();
            ClassGroup course = courseRepository.save(new ClassGroup("Demo Course"));
            courseTeacherRepository.save(new ClassGroupTeacher(course, teacher.getId()));

            Task task = taskRepository.save(new Task(
                    course,
                    "Projekt 1",
                    "Opis projektu",
                    Instant.now(),
                    Instant.now().plusSeconds(30L * 24 * 3600),
                    teacher.getId()
            ));
            Stage stage = stageRepository.save(new Stage(
                    task,
                    "Etap 1",
                    100,
                    Instant.now().plusSeconds(86400),
                    Instant.now().plusSeconds(172800),
                    10.0,
                    50.0
            ));
            artifactRepository.save(new Artifact(stage, "Raport PDF", ArtifactType.PDF, 10_000_000L, "pdf"));

            // przypisz studentów do kursu
            userRepository.findByEmail("s1@example.com").ifPresent(u -> courseStudentRepository.save(new CourseStudent(course, u.getId(), "G1", "A001")));
            userRepository.findByEmail("s2@example.com").ifPresent(u -> courseStudentRepository.save(new CourseStudent(course, u.getId(), "G1", "A002")));
            userRepository.findByEmail("s3@example.com").ifPresent(u -> courseStudentRepository.save(new CourseStudent(course, u.getId(), "G2", "A003")));
            log.info("Seeded demo course/task/stage/artifact and students assigned");
        } else {
            // Przypisz teachera do wszystkich istniejących kursów (na potrzeby dev)
            User teacher = userRepository.findByEmail("teacher@example.com").orElseThrow();
            List<ClassGroup> allCourses = courseRepository.findAll();
            for (ClassGroup c : allCourses) {
                boolean alreadyAssigned = courseTeacherRepository.findByTeacherId(teacher.getId()).stream()
                        .anyMatch(ct -> ct.getClassGroup().getId().equals(c.getId()));
                if (!alreadyAssigned) {
                    courseTeacherRepository.save(new ClassGroupTeacher(c, teacher.getId()));
                    log.info("Assigned teacher to existing course: " + c.getName());
                }
            }
        }
    }

    private void ensureUser(String email, String rawPassword, UserRole role, String first, String last) {
        userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User(email, passwordEncoder.encode(rawPassword), role, first, last);
            return userRepository.save(u);
        });
    }
}


