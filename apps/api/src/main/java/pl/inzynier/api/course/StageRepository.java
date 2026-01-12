package pl.inzynier.api.course;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StageRepository extends JpaRepository<Stage, Long> {
    List<Stage> findByTaskId(Long taskId);
}






