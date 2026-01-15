package pl.inzynier.api.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void log(String eventType, Long actorId, String contextJson) {
        repository.save(new AuditLog(eventType, actorId, contextJson));
    }
    
    @Transactional
    public void log(String eventType, String message) {
        repository.save(new AuditLog(eventType, null, message));
    }

    /**
     * Wygodny overload akceptujący enum typów zdarzeń.
     */
    @Transactional
    public void log(AuditEventType type, Long actorId, String contextJson) {
        log(type.name(), actorId, contextJson);
    }
}






