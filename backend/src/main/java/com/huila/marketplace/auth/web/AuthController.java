package com.huila.marketplace.auth.web;

import com.huila.marketplace.auth.application.LoginService;
import com.huila.marketplace.auth.application.RegisterUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final RegisterUserService registerUserService;
    private final LoginService loginService;

    public AuthController(RegisterUserService registerUserService, LoginService loginService) {
        this.registerUserService = registerUserService;
        this.loginService = loginService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        var summary =
                registerUserService.register(request.name(), request.email(), request.password(), request.role());
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(summary));
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return TokenResponse.from(loginService.login(request.email(), request.password()));
    }
}
