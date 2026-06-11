import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginUseCase } from "./login.use-case";
import { InvalidCredentialsError } from "../errors";
import { User } from "../../domain/entities/user.entity";
import type { IUserRepository } from "../ports/user-repository.port";
import type { IAuthCredentialRepository } from "../ports/auth-credential-repository.port";
import type { IPasswordHasher } from "../ports/password-hasher.port";
import type { ITokenService } from "../ports/token-service.port";
import type { ILDAPService } from "../ports/ldap-service.port";

describe("LoginUseCase", () => {
  let userRepository: IUserRepository;
  let authCredentialRepository: IAuthCredentialRepository;
  let passwordHasher: IPasswordHasher;
  let tokenService: ITokenService;
  let ldapService: ILDAPService;

  beforeEach(() => {
    userRepository = {
      save: vi.fn(),
      saveUserAndOutbox: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByLogin: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
      findByIdentifier: vi.fn().mockImplementation((val: string) => {
        if (val.includes("@")) {
          return userRepository.findByEmail(val);
        }
        return userRepository.findByLogin(val);
      }),
    };
    authCredentialRepository = {
      getPasswordHashByUserId: vi.fn(),
    };
    passwordHasher = {
      hash: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };
    tokenService = {
      sign: vi.fn().mockReturnValue("fake-jwt-token"),
      verify: vi.fn(),
    };
    ldapService = {
      authenticate: vi.fn(),
    };
  });

  it("deve retornar user e accessToken quando credenciais são válidas", async () => {
    const user = User.reconstitute(
      "user-1",
      "u@example.com",
      "Nome",
      new Date("2025-01-01T00:00:00.000Z"),
      "user"
    );

    vi.mocked(userRepository.findByEmail).mockResolvedValue(user);
    vi.mocked(authCredentialRepository.getPasswordHashByUserId).mockResolvedValue("hashed");
    vi.mocked(passwordHasher.verify).mockResolvedValue(true);

    const useCase = new LoginUseCase(
      userRepository,
      authCredentialRepository,
      passwordHasher,
      tokenService
    );
    const result = await useCase.execute({ email: "u@example.com", password: "senha123" });

    expect(result.user).toEqual({
      id: "user-1",
      email: "u@example.com",
      login: "u@example.com",
      name: "Nome",
      role: "user",
      status: "active",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    expect(result.accessToken).toBe("fake-jwt-token");
    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: "user-1",
      email: "u@example.com",
      role: "user",
    });
  });

  it("deve lançar InvalidCredentialsError quando usuário não existe e LDAP falha", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(ldapService.authenticate).mockResolvedValue(null);

    const useCase = new LoginUseCase(
      userRepository,
      authCredentialRepository,
      passwordHasher,
      tokenService,
      ldapService
    );

    await expect(
      useCase.execute({ email: "naoexiste@example.com", password: "qualquer" })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("deve provisionar JIT o usuário e autenticar com sucesso quando existe no LDAP mas não localmente", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    const existingUser = User.reconstitute("exist-id", "primeiro@example.com", "Primeiro", new Date(), "admin");
    vi.mocked(userRepository.findAll).mockResolvedValue([existingUser]);
    vi.mocked(ldapService.authenticate).mockResolvedValue({
      email: "john.doe@corp.internal",
      login: "jdoe",
      name: "John Doe",
    });

    const useCase = new LoginUseCase(
      userRepository,
      authCredentialRepository,
      passwordHasher,
      tokenService,
      ldapService
    );

    const result = await useCase.execute({ email: "john.doe@corp.internal", password: "LdapPassword123" });

    expect(result.user.email).toBe("john.doe@corp.internal");
    expect(result.user.name).toBe("John Doe");
    expect(result.user.login).toBe("jdoe");
    expect(result.user.role).toBe("user");
    expect(result.accessToken).toBe("fake-jwt-token");

    // Verifica o provisionamento do usuário no banco com Transacional Outbox
    expect(userRepository.saveUserAndOutbox).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John Doe",
        role: "user",
      }),
      expect.objectContaining({
        eventName: "user.created",
        payload: expect.objectContaining({
          email: "john.doe@corp.internal",
          name: "John Doe",
        }),
      })
    );
  });

  it("deve autenticar com sucesso um usuário local existente cuja validação local de senha falha mas validação LDAP é bem sucedida", async () => {
    const user = User.reconstitute(
      "user-1",
      "john.doe@corp.internal",
      "John Doe",
      new Date("2025-01-01T00:00:00.000Z"),
      "user"
    );

    vi.mocked(userRepository.findByEmail).mockResolvedValue(user);
    vi.mocked(authCredentialRepository.getPasswordHashByUserId).mockResolvedValue("hashed");
    vi.mocked(passwordHasher.verify).mockResolvedValue(false); // Local verification fails
    vi.mocked(ldapService.authenticate).mockResolvedValue({
      email: "john.doe@corp.internal",
      login: "jdoe",
      name: "John Doe",
    }); // LDAP succeeds

    const useCase = new LoginUseCase(
      userRepository,
      authCredentialRepository,
      passwordHasher,
      tokenService,
      ldapService
    );

    const result = await useCase.execute({ email: "john.doe@corp.internal", password: "LdapPassword123" });

    expect(result.user.email).toBe("john.doe@corp.internal");
    expect(result.accessToken).toBe("fake-jwt-token");
    expect(ldapService.authenticate).toHaveBeenCalledWith("john.doe@corp.internal", "LdapPassword123");
  });

  it("deve JIT provisionar como admin se for o primeiro usuario do sistema", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findAll).mockResolvedValue([]);
    vi.mocked(ldapService.authenticate).mockResolvedValue({
      email: "first.ldap@corp.internal",
      login: "firstldap",
      name: "First LDAP",
    });

    const useCase = new LoginUseCase(
      userRepository,
      authCredentialRepository,
      passwordHasher,
      tokenService,
      ldapService
    );

    const result = await useCase.execute({ email: "first.ldap@corp.internal", password: "password123" });
    expect(result.user.role).toBe("admin");
  });

  it("deve JIT provisionar como user se nao for o primeiro usuario do sistema", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    const existingUser = User.reconstitute("exist-id", "primeiro@example.com", "Primeiro", new Date(), "admin");
    vi.mocked(userRepository.findAll).mockResolvedValue([existingUser]);
    vi.mocked(ldapService.authenticate).mockResolvedValue({
      email: "second.ldap@corp.internal",
      login: "secondldap",
      name: "Second LDAP",
    });

    const useCase = new LoginUseCase(
      userRepository,
      authCredentialRepository,
      passwordHasher,
      tokenService,
      ldapService
    );

    const result = await useCase.execute({ email: "second.ldap@corp.internal", password: "password123" });
    expect(result.user.role).toBe("user");
  });
});
