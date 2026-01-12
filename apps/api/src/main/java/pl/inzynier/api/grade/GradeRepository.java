package pl.inzynier.api.grade;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GradeRepository extends JpaRepository<Grade, Long> {
    java.util.List<Grade> findByRevisionId(Long revisionId);
}

