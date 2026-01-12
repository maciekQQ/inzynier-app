package pl.inzynier.api.student;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pl.inzynier.api.course.ClassGroup;
import pl.inzynier.api.student.dto.ChangePasswordRequest;
import pl.inzynier.api.user.User;
import pl.inzynier.api.user.UserRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasAuthority('ROLE_STUDENT')")
public class StudentProfileController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public StudentProfileController(UserRepository userRepository,
                                    PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/profile")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getProfile(@AuthenticationPrincipal User student) {
        User loaded = userRepository.findById(student.getId()).orElse(student);
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", loaded.getId());
        profile.put("firstName", loaded.getFirstName());
        profile.put("lastName", loaded.getLastName());
        profile.put("email", loaded.getEmail());
        profile.put("albumNumber", loaded.getAlbumNumber() != null ? loaded.getAlbumNumber() : "");
        
        ClassGroup group = loaded.getClassGroup();
        profile.put("groupName", group != null ? group.getName() : "Brak grupy");
        profile.put("groupId", group != null ? group.getId() : null);

        return ResponseEntity.ok(profile);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal User student,
            @RequestBody ChangePasswordRequest request) {

        if (!passwordEncoder.matches(request.oldPassword(), student.getPasswordHash())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Nieprawidłowe stare hasło"));
        }

        if (request.newPassword() == null || request.newPassword().length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Nowe hasło musi mieć co najmniej 6 znaków"));
        }

        student.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(student);

        return ResponseEntity.ok(Map.of("status", "success", "message", "Hasło zostało zmienione"));
    }
}
