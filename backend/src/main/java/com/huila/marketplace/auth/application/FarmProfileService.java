package com.huila.marketplace.auth.application;

import com.huila.marketplace.auth.domain.FarmProfile;
import com.huila.marketplace.auth.infrastructure.FarmProfileRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FarmProfileService {

    private final FarmProfileRepository farmProfileRepository;

    public FarmProfileService(FarmProfileRepository farmProfileRepository) {
        this.farmProfileRepository = farmProfileRepository;
    }

    public FarmProfile save(UUID userId, String department, String municipality, String village, String farmName) {
        FarmProfile profile = farmProfileRepository
                .findById(userId)
                .orElseGet(() -> new FarmProfile(userId, department, municipality, village, farmName));
        profile.update(department, municipality, village, farmName);
        return farmProfileRepository.save(profile);
    }

    public FarmProfile get(UUID userId) {
        return farmProfileRepository
                .findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil de finca no encontrado"));
    }
}
