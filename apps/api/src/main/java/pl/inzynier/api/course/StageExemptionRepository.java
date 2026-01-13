package pl.inzynier.api.course;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StageExemptionRepository extends JpaRepository<StageExemption, Long> {
    Optional<StageExemption> findByStageIdAndStudentId(Long stageId, Long studentId);
    List<StageExemption> findByStageId(Long stageId);
}






