package pl.inzynier.api.course;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskMaterialRepository extends JpaRepository<TaskMaterial, Long> {
    List<TaskMaterial> findByTaskId(Long taskId);
}

