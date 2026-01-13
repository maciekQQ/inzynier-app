package pl.inzynier.api.course;

import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Serwis domenowy do walidacji reguł biznesowych dla etapów.
 */
@Component
public class StageValidator {

    /**
     * Waliduje, czy softDeadline <= hardDeadline oraz softDeadline nie jest w przeszłości.
     * @throws IllegalArgumentException jeśli warunek nie jest spełniony
     */
    public void validateDeadlines(Instant softDeadline, Instant hardDeadline) {
        if (softDeadline != null) {
            if (softDeadline.isBefore(Instant.now())) {
                throw new IllegalArgumentException("Termin preferowany nie może być wcześniejszy niż teraz.");
            }
        }
        if (softDeadline != null && hardDeadline != null) {
            if (softDeadline.isAfter(hardDeadline)) {
                throw new IllegalArgumentException(
                    "Termin miękki (soft deadline) musi być wcześniejszy lub równy terminowi twardemu (hard deadline)"
                );
            }
        }
    }

    /**
     * Waliduje parametry kar za spóźnienie.
     */
    public void validatePenaltyParams(Double penaltyK, Double penaltyM) {
        if (penaltyK != null && (penaltyK < 0 || penaltyK > 100)) {
            throw new IllegalArgumentException("Kara K% musi być w zakresie 0-100");
        }
        if (penaltyM != null && (penaltyM < 0 || penaltyM > 100)) {
            throw new IllegalArgumentException("Maksymalna kara M% musi być w zakresie 0-100");
        }
        if (penaltyK != null && penaltyM != null && penaltyK > penaltyM) {
            throw new IllegalArgumentException("Kara K% nie może być większa niż maksymalna kara M%");
        }
    }
}

