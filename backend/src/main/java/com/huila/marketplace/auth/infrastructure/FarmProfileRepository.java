package com.huila.marketplace.auth.infrastructure;

import com.huila.marketplace.auth.domain.FarmProfile;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FarmProfileRepository extends JpaRepository<FarmProfile, UUID> {
}
