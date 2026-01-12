package pl.inzynier.api.grading;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

@Component
public class LatePenaltyCalculator {

    public double computePenaltyPercent(Instant softDeadline,
                                        Instant hardDeadline,
                                        Instant submittedAt,
                                        boolean allowAfterHard,
                                        double penaltyKPercentPer24h,
                                        double penaltyMaxMPercent) {
        if (softDeadline == null || submittedAt.isBefore(softDeadline) || submittedAt.equals(softDeadline)) {
            return 0.0;
        }

        if (hardDeadline != null && submittedAt.isAfter(hardDeadline) && !allowAfterHard) {
            return 100.0;
        }

        Instant effectiveSoft = softDeadline;
        if (hardDeadline != null && submittedAt.isAfter(hardDeadline) && allowAfterHard) {
            submittedAt = hardDeadline;
        }

        long lateMinutes = Duration.between(effectiveSoft, submittedAt).toMinutes();
        long lateDaysStarted = (lateMinutes + (24 * 60) - 1) / (24 * 60);
        double penalty = lateDaysStarted * penaltyKPercentPer24h;
        return Math.min(penalty, penaltyMaxMPercent);
    }

    public double applyPenalty(double bruttoPoints, double penaltyPercent) {
        if (Double.isNaN(bruttoPoints)) {
            return 0.0;
        }
        double factor = Math.max(0, 1 - penaltyPercent / 100.0);
        return bruttoPoints * factor;
    }
}






