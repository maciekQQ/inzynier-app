package pl.inzynier.api.audit;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt = Instant.now();

    @Column(name = "context_json", columnDefinition = "text", nullable = false)
    private String contextJson;

    protected AuditLog() {
    }

    public AuditLog(String eventType, Long actorId, String contextJson) {
        this.eventType = eventType;
        this.actorId = actorId;
        this.contextJson = contextJson;
    }

    public Long getId() {
        return id;
    }

    public String getEventType() {
        return eventType;
    }

    public Long getActorId() {
        return actorId;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getContextJson() {
        return contextJson;
    }
}


