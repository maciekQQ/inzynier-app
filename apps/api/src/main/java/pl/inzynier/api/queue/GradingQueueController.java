package pl.inzynier.api.queue;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pl.inzynier.api.revision.RevisionStatus;
import pl.inzynier.api.course.TaskRepository;
import pl.inzynier.api.course.StageRepository;
import pl.inzynier.api.course.ArtifactRepository;
import pl.inzynier.api.course.TaskStudentRepository;
import pl.inzynier.api.course.CourseStudentRepository;
import pl.inzynier.api.user.UserRepository;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/grading-queue")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
public class GradingQueueController {

    private final GradingQueueRepository repository;
    private final pl.inzynier.api.course.ClassGroupTeacherRepository classGroupTeacherRepository;
    private final TaskRepository taskRepository;
    private final StageRepository stageRepository;
    private final ArtifactRepository artifactRepository;
    private final TaskStudentRepository taskStudentRepository;
    private final CourseStudentRepository courseStudentRepository;
    private final UserRepository userRepository;

    public GradingQueueController(GradingQueueRepository repository,
                                  pl.inzynier.api.course.ClassGroupTeacherRepository classGroupTeacherRepository,
                                  TaskRepository taskRepository,
                                  StageRepository stageRepository,
                                  ArtifactRepository artifactRepository,
                                  TaskStudentRepository taskStudentRepository,
                                  CourseStudentRepository courseStudentRepository,
                                  UserRepository userRepository) {
        this.repository = repository;
        this.classGroupTeacherRepository = classGroupTeacherRepository;
        this.taskRepository = taskRepository;
        this.stageRepository = stageRepository;
        this.artifactRepository = artifactRepository;
        this.taskStudentRepository = taskStudentRepository;
        this.courseStudentRepository = courseStudentRepository;
        this.userRepository = userRepository;
    }

    /**
     * Podstawowy endpoint - wszystkie prace dla etapu z opcjonalnym filtrem statusu.
     */
    @GetMapping("/stage/{stageId}")
    public ResponseEntity<List<GradingQueueEntry>> byStage(
            @PathVariable Long stageId,
            @RequestParam(value = "status", required = false) RevisionStatus status) {
        if (status != null) {
            return ResponseEntity.ok(repository.findByStageIdAndLastRevisionStatus(stageId, status));
        }
        return ResponseEntity.ok(repository.findByStageId(stageId));
    }

    /**
     * Rozszerzony endpoint z filtrami dla interfejsu oceniania (lewa kolumna).
     * Filtry: status, deadline (upcoming/overdue), sortowanie.
     */
    @GetMapping("/stage/{stageId}/filtered")
    public ResponseEntity<List<GradingQueueEntry>> byStageFiltered(
            @PathVariable Long stageId,
            @RequestParam(required = false) String statusFilter,
            @RequestParam(required = false) String deadlineFilter,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false, defaultValue = "deadline") String sortBy) {
        
        List<GradingQueueEntry> entries = repository.findByStageId(stageId);

        if (courseId != null) {
            entries = entries.stream().filter(e -> courseId.equals(e.getCourseId())).collect(Collectors.toList());
        }
        if (taskId != null) {
            entries = entries.stream().filter(e -> taskId.equals(e.getTaskId())).collect(Collectors.toList());
        }
        if (groupName != null) {
            entries = entries.stream()
                    .filter(e -> e.getAlbumNumber() != null && e.getAlbumNumber().startsWith(groupName))
                    .collect(Collectors.toList());
        }

        // Filtr: status (SUBMITTED, NEEDS_FIX, ACCEPTED, REJECTED, ALL)
        if (statusFilter != null && !statusFilter.equalsIgnoreCase("ALL")) {
            try {
                RevisionStatus statusEnum = RevisionStatus.valueOf(statusFilter.toUpperCase());
                entries = entries.stream()
                        .filter(e -> statusEnum.equals(e.getLastRevisionStatus()))
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                // ignoruj nieprawidłowy status
            }
        }

        // Filtr: deadline
        if (deadlineFilter != null) {
            Instant now = Instant.now();
            if (deadlineFilter.equalsIgnoreCase("upcoming")) {
                // Zbliżające się (przed soft deadline)
                entries = entries.stream()
                        .filter(e -> e.getSoftDeadline() != null && e.getSoftDeadline().isAfter(now))
                        .collect(Collectors.toList());
            } else if (deadlineFilter.equalsIgnoreCase("overdue")) {
                // Spóźnione (po soft deadline)
                entries = entries.stream()
                        .filter(e -> e.getSoftDeadline() != null && e.getSoftDeadline().isBefore(now))
                        .collect(Collectors.toList());
            } else if (deadlineFilter.equalsIgnoreCase("critical")) {
                // Krytyczne (po hard deadline)
                entries = entries.stream()
                        .filter(e -> e.getHardDeadline() != null && e.getHardDeadline().isBefore(now))
                        .collect(Collectors.toList());
            }
        }

        // Sortowanie
        if ("deadline".equalsIgnoreCase(sortBy)) {
            entries.sort(Comparator.comparing(
                    e -> e.getSoftDeadline() != null ? e.getSoftDeadline() : Instant.MAX,
                    Comparator.naturalOrder()
            ));
        } else if ("status".equalsIgnoreCase(sortBy)) {
            entries.sort(Comparator.comparing(
                    e -> e.getLastRevisionStatus() != null ? e.getLastRevisionStatus().name() : "",
                    Comparator.naturalOrder()
            ));
        } else if ("student".equalsIgnoreCase(sortBy)) {
            entries.sort(Comparator.comparing(
                    e -> e.getStudentName() != null ? e.getStudentName() : "",
                    Comparator.naturalOrder()
            ));
        } else if ("penalty".equalsIgnoreCase(sortBy)) {
            entries.sort(Comparator.comparing(
                    e -> e.getPenaltyPercentApplied() != null ? e.getPenaltyPercentApplied() : 0.0,
                    Comparator.reverseOrder()
            ));
        }

        return ResponseEntity.ok(entries);
    }

    /**
     * Widok dla nauczyciela: wszystkie prace w jego grupach (opcjonalnie filtr kurs/task/stage/status/termin/grupa).
     */
    @GetMapping("/teacher")
    @Transactional(readOnly = true)
    public ResponseEntity<List<GradingQueueTeacherViewDto>> teacherView(
            @org.springframework.security.core.annotation.AuthenticationPrincipal pl.inzynier.api.user.User teacher,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) Long stageId,
            @RequestParam(required = false) String statusFilter,
            @RequestParam(required = false) String deadlineFilter,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false, defaultValue = "deadline") String sortBy) {

        var groupIds = classGroupTeacherRepository.findByTeacherId(teacher.getId()).stream()
                .map(pl.inzynier.api.course.ClassGroupTeacher::getClassGroup)
                .map(pl.inzynier.api.course.ClassGroup::getId)
                .collect(Collectors.toSet());
        if (groupIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<GradingQueueEntry> entries = repository.findAll().stream()
                .filter(e -> groupIds.contains(e.getCourseId()))
                .collect(Collectors.toList());

        if (courseId != null) entries = entries.stream().filter(e -> courseId.equals(e.getCourseId())).toList();
        if (taskId != null) entries = entries.stream().filter(e -> taskId.equals(e.getTaskId())).toList();
        if (stageId != null) entries = entries.stream().filter(e -> stageId.equals(e.getStageId())).toList();

        if (statusFilter != null && !statusFilter.equalsIgnoreCase("ALL")) {
            try {
                var st = RevisionStatus.valueOf(statusFilter.toUpperCase());
                entries = entries.stream().filter(e -> st.equals(e.getLastRevisionStatus())).toList();
            } catch (Exception ignored) {}
        }

        if (deadlineFilter != null) {
            Instant now = Instant.now();
            if (deadlineFilter.equalsIgnoreCase("upcoming")) {
                entries = entries.stream().filter(e -> e.getSoftDeadline() != null && e.getSoftDeadline().isAfter(now)).toList();
            } else if (deadlineFilter.equalsIgnoreCase("overdue")) {
                entries = entries.stream().filter(e -> e.getSoftDeadline() != null && e.getSoftDeadline().isBefore(now)).toList();
            } else if (deadlineFilter.equalsIgnoreCase("critical")) {
                entries = entries.stream().filter(e -> e.getHardDeadline() != null && e.getHardDeadline().isBefore(now)).toList();
            }
        }

        if (groupName != null) {
            entries = entries.stream()
                    .filter(e -> e.getAlbumNumber() != null && e.getAlbumNumber().startsWith(groupName))
                    .toList();
        }

        if ("status".equalsIgnoreCase(sortBy)) {
            entries = entries.stream()
                    .sorted(Comparator.comparing(e -> e.getLastRevisionStatus() != null ? e.getLastRevisionStatus().name() : ""))
                    .toList();
        } else if ("student".equalsIgnoreCase(sortBy)) {
            entries = entries.stream()
                    .sorted(Comparator.comparing(e -> e.getStudentName() != null ? e.getStudentName() : ""))
                    .toList();
        } else if ("penalty".equalsIgnoreCase(sortBy)) {
            entries = entries.stream()
                    .sorted(Comparator.comparing(e -> e.getPenaltyPercentApplied() != null ? e.getPenaltyPercentApplied() : 0.0, Comparator.reverseOrder()))
                    .toList();
        } else {
            entries = entries.stream()
                    .sorted(Comparator.comparing(e -> e.getSoftDeadline() != null ? e.getSoftDeadline() : Instant.MAX))
                    .toList();
        }

        // istniejące wpisy z kolejki (mają oddania)
        List<GradingQueueTeacherViewDto> dto = entries.stream().map(e -> {
            var task = taskRepository.findById(e.getTaskId()).orElse(null);
            var stage = stageRepository.findById(e.getStageId()).orElse(null);
            var artifact = artifactRepository.findById(e.getId().getArtifactId()).orElse(null);
            String albumNumber = resolveAlbum(e.getCourseId(), e.getId().getStudentId(), e.getAlbumNumber());
            return new GradingQueueTeacherViewDto(
                    e.getId().getArtifactId(),
                    e.getStageId(),
                    e.getTaskId(),
                    e.getCourseId(),
                    e.getId().getStudentId(),
                    albumNumber,
                    e.getStudentName(),
                    task != null ? task.getTitle() : null,
                    stage != null ? stage.getName() : null,
                    artifact != null ? artifact.getName() : null,
                    e.getLastRevisionId(),
                    e.getLastRevisionStatus(),
                    e.getLastSubmittedAt(),
                    e.getSoftDeadline(),
                    e.getHardDeadline(),
                    e.getPenaltyPercentApplied(),
                    e.getLastPointsBrutto(),
                    e.getLastPointsNetto()
            );
        }).collect(Collectors.toList());

        // brak oddań, ale przydzieleni studenci -> dołóż wirtualne wpisy "jeszcze nie oddali"
        // klucz istniejących: artifactId-studentId
        var existingKeys = entries.stream()
                .map(e -> e.getId().getArtifactId() + "-" + e.getId().getStudentId())
                .collect(Collectors.toSet());

        // wszystkie zadania w kursach nauczyciela
        var tasks = taskRepository.findAll().stream()
                .filter(t -> groupIds.contains(t.getCourse().getId()))
                .toList();

        for (var task : tasks) {
            var stages = stageRepository.findByTaskId(task.getId());
            for (var stage : stages) {
                var artifacts = artifactRepository.findByStageId(stage.getId());
                var assignments = taskStudentRepository.findByTaskId(task.getId());
                for (var ts : assignments) {
                    Long studentId = ts.getStudentId();
                    for (var artifact : artifacts) {
                        String key = artifact.getId() + "-" + studentId;
                        if (existingKeys.contains(key)) continue; // już jest wpis z oddaniem
                        var cs = courseStudentRepository.findByCourseIdAndStudentId(task.getCourse().getId(), studentId).orElse(null);
                        var user = userRepository.findById(studentId).orElse(null);
                        String albumNumber = resolveAlbum(task.getCourse().getId(), studentId, cs != null ? cs.getAlbumNumber() : null);
                        dto.add(new GradingQueueTeacherViewDto(
                                artifact.getId(),
                                stage.getId(),
                                task.getId(),
                                task.getCourse().getId(),
                                studentId,
                                albumNumber,
                                user != null ? (user.getFirstName() + " " + user.getLastName()) : null,
                                task.getTitle(),
                                stage.getName(),
                                artifact.getName(),
                                null,
                                null,
                                null,
                                stage.getSoftDeadline(),
                                stage.getHardDeadline(),
                                null,
                                null,
                                null
                        ));
                    }
                }
            }
        }

        return ResponseEntity.ok(dto);
    }

    private String resolveAlbum(Long courseId, Long studentId, String existing) {
        if (existing != null && !existing.isBlank()) return existing;
        var cs = courseStudentRepository.findByCourseIdAndStudentId(courseId, studentId).orElse(null);
        if (cs != null && cs.getAlbumNumber() != null && !cs.getAlbumNumber().isBlank()) {
            return cs.getAlbumNumber();
        }
        return userRepository.findById(studentId)
                .map(pl.inzynier.api.user.User::getAlbumNumber)
                .orElse(null);
    }
}






