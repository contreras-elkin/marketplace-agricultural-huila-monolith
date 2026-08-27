package com.huila.marketplace.auth.application;

import com.huila.marketplace.auth.Role;
import com.huila.marketplace.auth.UserSummary;
import com.huila.marketplace.auth.domain.User;
import com.huila.marketplace.auth.infrastructure.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RegisterUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RegisterUserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserSummary register(String name, String email, String rawPassword, Role role) {
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya está registrado");
        }
        User user = new User(name, email, passwordEncoder.encode(rawPassword), role);
        userRepository.save(user);
        return new UserSummary(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
