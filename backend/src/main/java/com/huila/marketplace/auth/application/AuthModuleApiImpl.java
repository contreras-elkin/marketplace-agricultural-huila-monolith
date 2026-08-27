package com.huila.marketplace.auth.application;

import com.huila.marketplace.auth.AuthModuleApi;
import com.huila.marketplace.auth.Role;
import com.huila.marketplace.auth.UserSummary;
import com.huila.marketplace.auth.domain.User;
import com.huila.marketplace.auth.infrastructure.UserRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthModuleApiImpl implements AuthModuleApi {

    private final UserRepository userRepository;

    public AuthModuleApiImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserSummary getUserSummary(UUID userId) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        return new UserSummary(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    @Override
    public boolean isProducer(UUID userId) {
        return userRepository.findById(userId).map(user -> user.getRole() == Role.PRODUCER).orElse(false);
    }
}
