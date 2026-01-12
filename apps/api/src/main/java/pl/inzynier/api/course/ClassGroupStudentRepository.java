package pl.inzynier.api.course;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClassGroupStudentRepository extends JpaRepository<ClassGroupStudent, Long> {
    List<ClassGroupStudent> findByClassGroupId(Long classGroupId);
    Optional<ClassGroupStudent> findByClassGroupIdAndStudentId(Long classGroupId, Long studentId);
    List<ClassGroupStudent> findByStudentId(Long studentId);
    void deleteByStudentId(Long studentId);
}

