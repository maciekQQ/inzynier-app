package pl.inzynier.api.revision;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RevisionFeedbackMaterialRepository extends JpaRepository<RevisionFeedbackMaterial, Long> {
    List<RevisionFeedbackMaterial> findByRevisionIdOrderByCreatedAtDesc(Long revisionId);
}

