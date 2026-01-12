package pl.inzynier.api.queue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pl.inzynier.api.revision.RevisionStatus;

import java.util.List;

public interface GradingQueueRepository extends JpaRepository<GradingQueueEntry, GradingQueueId> {
    
    @Query("SELECT e FROM GradingQueueEntry e WHERE e.stageId = :stageId")
    List<GradingQueueEntry> findByStageId(@Param("stageId") Long stageId);
    
    @Query("SELECT e FROM GradingQueueEntry e WHERE e.stageId = :stageId AND e.lastRevisionStatus = :status")
    List<GradingQueueEntry> findByStageIdAndLastRevisionStatus(
        @Param("stageId") Long stageId, 
        @Param("status") RevisionStatus status
    );
    
    @Query("SELECT e FROM GradingQueueEntry e WHERE e.courseId = :courseId")
    List<GradingQueueEntry> findByCourseId(@Param("courseId") Long courseId);
}

