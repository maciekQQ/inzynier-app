package pl.inzynier.api.queue;

import jakarta.persistence.*;
import java.time.Instant;
import pl.inzynier.api.revision.RevisionStatus;

@Entity
@Table(name = "grading_queue")
public class GradingQueueEntry {
    @EmbeddedId
    private GradingQueueId id;

    @Column(name = "stage_id", nullable = false)
    private Long stageId;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "album_number")
    private String albumNumber;

    @Column(name = "student_name")
    private String studentName;

    @Column(name = "last_revision_id")
    private Long lastRevisionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_revision_status")
    private RevisionStatus lastRevisionStatus;

    @Column(name = "last_submitted_at")
    private Instant lastSubmittedAt;

    @Column(name = "soft_deadline")
    private Instant softDeadline;

    @Column(name = "hard_deadline")
    private Instant hardDeadline;

    @Column(name = "late_days_started_24h")
    private Integer lateDaysStarted24h;

    @Column(name = "penalty_percent_applied")
    private Double penaltyPercentApplied;

    @Column(name = "last_points_brutto")
    private Double lastPointsBrutto;

    @Column(name = "last_points_netto")
    private Double lastPointsNetto;

    @Column(name = "last_accepted_revision_id")
    private Long lastAcceptedRevisionId;

    @Column(name = "last_accepted_points_netto")
    private Double lastAcceptedPointsNetto;

    @Column(name = "flag_new_submission")
    private Boolean flagNewSubmission;

    public GradingQueueEntry() {
    }

    public GradingQueueEntry(GradingQueueId id) {
        this.id = id;
    }

    public GradingQueueId getId() {
        return id;
    }

    public Long getStageId() {
        return stageId;
    }

    public Long getTaskId() {
        return taskId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public String getAlbumNumber() {
        return albumNumber;
    }

    public String getStudentName() {
        return studentName;
    }

    public Long getLastRevisionId() {
        return lastRevisionId;
    }

    public RevisionStatus getLastRevisionStatus() {
        return lastRevisionStatus;
    }

    public Instant getLastSubmittedAt() {
        return lastSubmittedAt;
    }

    public Instant getSoftDeadline() {
        return softDeadline;
    }

    public Instant getHardDeadline() {
        return hardDeadline;
    }

    public Integer getLateDaysStarted24h() {
        return lateDaysStarted24h;
    }

    public Double getPenaltyPercentApplied() {
        return penaltyPercentApplied;
    }

    public Double getLastPointsBrutto() {
        return lastPointsBrutto;
    }

    public Double getLastPointsNetto() {
        return lastPointsNetto;
    }

    public Long getLastAcceptedRevisionId() {
        return lastAcceptedRevisionId;
    }

    public Double getLastAcceptedPointsNetto() {
        return lastAcceptedPointsNetto;
    }

    public Boolean getFlagNewSubmission() {
        return flagNewSubmission;
    }

    public void setStageId(Long stageId) {
        this.stageId = stageId;
    }

    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public void setAlbumNumber(String albumNumber) {
        this.albumNumber = albumNumber;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public void setLastRevisionId(Long lastRevisionId) {
        this.lastRevisionId = lastRevisionId;
    }

    public void setLastRevisionStatus(RevisionStatus lastRevisionStatus) {
        this.lastRevisionStatus = lastRevisionStatus;
    }

    public void setLastSubmittedAt(Instant lastSubmittedAt) {
        this.lastSubmittedAt = lastSubmittedAt;
    }

    public void setSoftDeadline(Instant softDeadline) {
        this.softDeadline = softDeadline;
    }

    public void setHardDeadline(Instant hardDeadline) {
        this.hardDeadline = hardDeadline;
    }

    public void setLateDaysStarted24h(Integer lateDaysStarted24h) {
        this.lateDaysStarted24h = lateDaysStarted24h;
    }

    public void setPenaltyPercentApplied(Double penaltyPercentApplied) {
        this.penaltyPercentApplied = penaltyPercentApplied;
    }

    public void setLastPointsBrutto(Double lastPointsBrutto) {
        this.lastPointsBrutto = lastPointsBrutto;
    }

    public void setLastPointsNetto(Double lastPointsNetto) {
        this.lastPointsNetto = lastPointsNetto;
    }

    public void setLastAcceptedRevisionId(Long lastAcceptedRevisionId) {
        this.lastAcceptedRevisionId = lastAcceptedRevisionId;
    }

    public void setLastAcceptedPointsNetto(Double lastAcceptedPointsNetto) {
        this.lastAcceptedPointsNetto = lastAcceptedPointsNetto;
    }

    public void setFlagNewSubmission(Boolean flagNewSubmission) {
        this.flagNewSubmission = flagNewSubmission;
    }
}

