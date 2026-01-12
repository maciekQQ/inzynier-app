package pl.inzynier.api.course;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StageExemptionRepository extends JpaRepository<StageExemption, Long> {
    Optional<StageExemption> findByStageIdAndStudentId(Long stageId, Long studentId);
}






