package pl.inzynier.api.grade;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.inzynier.api.user.User;

@RestController
@RequestMapping("/api/grades")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER')")
public class GradeController {

    private final GradeApplicationService gradeApplicationService;

    public GradeController(GradeApplicationService gradeApplicationService) {
        this.gradeApplicationService = gradeApplicationService;
    }

    @PostMapping
    public ResponseEntity<Grade> grade(@Valid @RequestBody GradeRevisionRequest request,
                                       @AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(gradeApplicationService.gradeRevision(request, teacher));
    }
}






