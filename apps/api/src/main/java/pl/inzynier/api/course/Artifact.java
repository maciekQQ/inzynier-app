package pl.inzynier.api.course;

import jakarta.persistence.*;

@Entity
@Table(name = "artifacts")
public class Artifact {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id", nullable = false)
    private Stage stage;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private ArtifactType type;

    @Column(name = "max_size_bytes")
    private Long maxSizeBytes;

    @Column(name = "allowed_extensions_csv")
    private String allowedExtensionsCsv;

    protected Artifact() {
    }

    public Artifact(Stage stage, String name, ArtifactType type, Long maxSizeBytes, String allowedExtensionsCsv) {
        this.stage = stage;
        this.name = name;
        this.type = type;
        this.maxSizeBytes = maxSizeBytes;
        this.allowedExtensionsCsv = allowedExtensionsCsv;
    }

    public Long getId() {
        return id;
    }

    public Stage getStage() {
        return stage;
    }

    public String getName() {
        return name;
    }

    public ArtifactType getType() {
        return type;
    }

    public Long getMaxSizeBytes() {
        return maxSizeBytes;
    }

    public String getAllowedExtensionsCsv() {
        return allowedExtensionsCsv;
    }
}






