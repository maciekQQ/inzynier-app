package pl.inzynier.api.grading;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

class LatePenaltyCalculatorTest {

    private final LatePenaltyCalculator calculator = new LatePenaltyCalculator();

    @Test
    void noPenaltyBeforeSoft() {
        Instant soft = Instant.now().plus(1, ChronoUnit.DAYS);
        double p = calculator.computePenaltyPercent(soft, null, Instant.now(), false, 10, 50);
        assertThat(p).isZero();
    }

    @Test
    void penaltyAccumulatesPerStartedDay() {
        Instant soft = Instant.parse("2024-01-01T00:00:00Z");
        Instant submit = soft.plus(25, ChronoUnit.HOURS); // 2 started days
        double p = calculator.computePenaltyPercent(soft, null, submit, false, 5, 50);
        assertThat(p).isEqualTo(10.0);
    }

    @Test
    void penaltyCapped() {
        Instant soft = Instant.parse("2024-01-01T00:00:00Z");
        Instant submit = soft.plus(10, ChronoUnit.DAYS);
        double p = calculator.computePenaltyPercent(soft, null, submit, false, 15, 20);
        assertThat(p).isEqualTo(20.0);
    }

    @Test
    void afterHardWithoutExemptionIsZeroPoints() {
        Instant soft = Instant.parse("2024-01-01T00:00:00Z");
        Instant hard = soft.plus(2, ChronoUnit.DAYS);
        Instant submit = hard.plus(1, ChronoUnit.HOURS);
        double p = calculator.computePenaltyPercent(soft, hard, submit, false, 10, 50);
        assertThat(p).isEqualTo(100.0);
    }

    @Test
    void applyPenaltyReducesPoints() {
        double net = calculator.applyPenalty(80.0, 25.0);
        assertThat(net).isEqualTo(60.0);
    }
}






