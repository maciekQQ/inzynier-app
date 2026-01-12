package pl.inzynier.api.course;

import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Serwis domenowy do walidacji wag etapów w zadaniu.
 * Wymaganie: suma wag etapów musi wynosić dokładnie 100%.
 */
@Component
public class TaskWeightValidator {

    private final StageRepository stageRepository;

    public TaskWeightValidator(StageRepository stageRepository) {
        this.stageRepository = stageRepository;
    }

    /**
     * Waliduje, czy suma wag etapów w zadaniu wynosi 100%.
     * @param taskId ID zadania
     * @throws IllegalStateException jeśli suma wag != 100%
     */
    public void validateTaskWeights(Long taskId) {
        List<Stage> stages = stageRepository.findByTaskId(taskId);
        int totalWeight = stages.stream()
                .mapToInt(Stage::getWeightPercent)
                .sum();
        
        if (totalWeight != 100) {
            throw new IllegalStateException(
                String.format("Suma wag etapów musi wynosić 100%%. Obecnie: %d%%", totalWeight)
            );
        }
    }

    /**
     * Sprawdza, czy dodanie nowego etapu o danej wadze nie przekroczy 100%.
     * @param taskId ID zadania
     * @param newWeight waga nowego etapu
     * @throws IllegalStateException jeśli suma przekroczy 100%
     */
    public void validateAddingStage(Long taskId, int newWeight) {
        List<Stage> stages = stageRepository.findByTaskId(taskId);
        int currentTotal = stages.stream()
                .mapToInt(Stage::getWeightPercent)
                .sum();
        
        if (currentTotal + newWeight > 100) {
            throw new IllegalStateException(
                String.format("Dodanie etapu o wadze %d%% przekroczy limit. Aktualna suma: %d%%, pozostało: %d%%", 
                    newWeight, currentTotal, 100 - currentTotal)
            );
        }
    }

    /**
     * Zwraca aktualną sumę wag i pozostałą dostępną wagę.
     */
    public WeightStatus getWeightStatus(Long taskId) {
        List<Stage> stages = stageRepository.findByTaskId(taskId);
        int totalWeight = stages.stream()
                .mapToInt(Stage::getWeightPercent)
                .sum();
        return new WeightStatus(totalWeight, 100 - totalWeight, stages.size());
    }

    public record WeightStatus(int currentTotal, int remaining, int stageCount) {}
}

