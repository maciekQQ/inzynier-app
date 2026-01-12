package pl.inzynier.api.course;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskStudentRepository extends JpaRepository<TaskStudent, Long> {
    
    @Query("SELECT ts FROM TaskStudent ts WHERE ts.task.id = :taskId")
    List<TaskStudent> findByTaskId(@Param("taskId") Long taskId);
    
    @Query("SELECT ts FROM TaskStudent ts WHERE ts.studentId = :studentId")
    List<TaskStudent> findByStudentId(@Param("studentId") Long studentId);
    
    @Query("SELECT ts FROM TaskStudent ts WHERE ts.task.id = :taskId AND ts.studentId = :studentId")
    List<TaskStudent> findByTaskIdAndStudentId(@Param("taskId") Long taskId, @Param("studentId") Long studentId);
    
    @Query("SELECT COUNT(ts) FROM TaskStudent ts WHERE ts.task.id = :taskId")
    long countByTaskId(@Param("taskId") Long taskId);
}

