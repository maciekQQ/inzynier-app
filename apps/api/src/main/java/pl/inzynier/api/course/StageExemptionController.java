package pl.inzynier.api.course;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.inzynier.api.grading.GradingQueueService;

@RestController
@RequestMapping("/api/exemptions")
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER')")
public class StageExemptionController {

    private final StageRepository stageRepository;
    private final StageExemptionRepository stageExemptionRepository;
    private final GradingQueueService gradingQueueService;

    public StageExemptionController(StageRepository stageRepository,
                                    StageExemptionRepository stageExemptionRepository,
                                    GradingQueueService gradingQueueService) {
        this.stageRepository = stageRepository;
        this.stageExemptionRepository = stageExemptionRepository;
        this.gradingQueueService = gradingQueueService;
    }

    @PostMapping
    public ResponseEntity<StageExemption> upsert(@Valid @RequestBody StageExemptionRequest request) {
        Stage stage = stageRepository.findById(request.stageId())
                .orElseThrow(() -> new IllegalArgumentException("Stage not found"));
        StageExemption exemption = stageExemptionRepository.findByStageIdAndStudentId(stage.getId(), request.studentId())
                .orElse(new StageExemption(stage, request.studentId(), request.allowAfterHard(),
                        request.customSoft(), request.customHard(), request.teacherId(), request.reason()));

        exemption = new StageExemption(stage, request.studentId(), request.allowAfterHard(),
                request.customSoft(), request.customHard(), request.teacherId(), request.reason());
        StageExemption saved = stageExemptionRepository.save(exemption);
        gradingQueueService.recomputeForStageAndStudent(stage.getId(), request.studentId());
        return ResponseEntity.ok(saved);
    }
}

