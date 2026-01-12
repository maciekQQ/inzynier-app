package pl.inzynier.api.storage;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping("/presign")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_STUDENT')")
    public ResponseEntity<Map<String, Object>> presign(@RequestBody StorageRequest request) {
        String key = request.prefix() + "/" + UUID.randomUUID() + "/" + request.originalFileName();
        var urls = storageService.presign(key);
        return ResponseEntity.ok(Map.of(
                "fileKey", urls.fileKey(),
                "uploadUrl", urls.uploadUrl(),
                "downloadUrl", urls.downloadUrl(),
                "expiresAt", urls.expiresAt()
        ));
    }
}

