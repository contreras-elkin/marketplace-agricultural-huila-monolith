package com.huila.marketplace.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "farm_profiles", schema = "auth")
public class FarmProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(nullable = false, length = 100)
    private String municipality;

    @Column(nullable = false, length = 100)
    private String village;

    @Column(name = "farm_name", nullable = false, length = 150)
    private String farmName;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected FarmProfile() {
        // JPA
    }

    public FarmProfile(UUID userId, String department, String municipality, String village, String farmName) {
        this.userId = userId;
        update(department, municipality, village, farmName);
    }

    public void update(String department, String municipality, String village, String farmName) {
        this.department = department;
        this.municipality = municipality;
        this.village = village;
        this.farmName = farmName;
        this.updatedAt = Instant.now();
    }

    public UUID getUserId() {
        return userId;
    }

    public String getDepartment() {
        return department;
    }

    public String getMunicipality() {
        return municipality;
    }

    public String getVillage() {
        return village;
    }

    public String getFarmName() {
        return farmName;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
