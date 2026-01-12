package pl.inzynier.api.course;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClassGroupTeacherRepository extends JpaRepository<ClassGroupTeacher, Long> {
    List<ClassGroupTeacher> findByTeacherId(Long teacherId);
    List<ClassGroupTeacher> findByClassGroupId(Long classGroupId);
    Optional<ClassGroupTeacher> findByClassGroupIdAndTeacherId(Long classGroupId, Long teacherId);
    void deleteByTeacherId(Long teacherId);
}

