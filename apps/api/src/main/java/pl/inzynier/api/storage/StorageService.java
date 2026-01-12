package pl.inzynier.api.storage;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Duration;
import java.util.List;

@Service
public class StorageService {

    private final StorageProperties props;
    private S3Client s3Client;
    private S3Presigner presigner;

    public StorageService(StorageProperties props) {
        this.props = props;
    }

    @PostConstruct
    public void init() {
        try {
            this.s3Client = buildClient();
            ensureBucketAndCors();
            this.presigner = buildPresigner();
        } catch (Exception e) {
            System.out.println("WARN: storage init skipped: " + e.getMessage());
        }
    }

    public StorageUrls presign(String key) {
        if (presigner == null) {
            presigner = buildPresigner();
        }

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .build();

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .build();

        var putPresign = presigner.presignPutObject(PutObjectPresignRequest.builder()
                .putObjectRequest(putObjectRequest)
                .signatureDuration(Duration.ofMinutes(15))
                .build());

        var getPresign = presigner.presignGetObject(GetObjectPresignRequest.builder()
                .getObjectRequest(getObjectRequest)
                .signatureDuration(Duration.ofMinutes(60))
                .build());

        return new StorageUrls(
                key,
                putPresign.url().toString(),
                getPresign.url().toString(),
                putPresign.expiration().toString()
        );
    }

    public String presignDownload(String key, Duration duration) {
        if (presigner == null) {
            presigner = buildPresigner();
        }
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .build();
        var getPresign = presigner.presignGetObject(GetObjectPresignRequest.builder()
                .getObjectRequest(getObjectRequest)
                .signatureDuration(duration)
                .build());
        return getPresign.url().toString();
    }

    private void ensureBucketAndCors() {
        if (s3Client == null) return;
        var buckets = s3Client.listBuckets();
        boolean exists = buckets.buckets().stream().anyMatch(b -> b.name().equals(props.getBucket()));
        if (!exists) {
            s3Client.createBucket(CreateBucketRequest.builder().bucket(props.getBucket()).build());
        }
        // CORS: allow browser uploads/downloads
        s3Client.putBucketCors(PutBucketCorsRequest.builder()
                .bucket(props.getBucket())
                .corsConfiguration(CORSConfiguration.builder()
                        .corsRules(List.of(CORSRule.builder()
                                .allowedMethods(List.of("GET", "PUT", "HEAD"))
                                .allowedOrigins(List.of("*"))
                                .allowedHeaders(List.of("*"))
                                .build()))
                        .build())
                .build());
    }

    private S3Client buildClient() {
        var builder = S3Client.builder()
                .region(Region.of(props.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey())
                ));
        if (props.getEndpoint() != null && !props.getEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(props.getEndpoint()))
                    .serviceConfiguration(S3Configuration.builder()
                            .pathStyleAccessEnabled(true)
                            .build());
        }
        return builder.build();
    }

    private S3Presigner buildPresigner() {
        String endpointToUse = props.getPublicEndpoint() != null && !props.getPublicEndpoint().isBlank()
                ? props.getPublicEndpoint()
                : props.getEndpoint();

        var builder = S3Presigner.builder()
                .region(Region.of(props.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey())
                ));

        if (endpointToUse != null && !endpointToUse.isBlank()) {
            builder.endpointOverride(URI.create(endpointToUse))
                    .serviceConfiguration(S3Configuration.builder()
                            .pathStyleAccessEnabled(true)
                            .build());
        }
        return builder.build();
    }

    public record StorageUrls(String fileKey, String uploadUrl, String downloadUrl, String expiresAt) {
    }
}

