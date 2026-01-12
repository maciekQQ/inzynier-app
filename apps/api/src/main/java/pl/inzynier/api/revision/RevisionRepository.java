package pl.inzynier.api.revision;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RevisionRepository extends JpaRepository<Revision, Long> {
    List<Revision> findByArtifactIdAndStudentIdOrderByCreatedAtDesc(Long artifactId, Long studentId);
}






