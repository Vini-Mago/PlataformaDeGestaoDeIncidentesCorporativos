import { randomUUID } from "crypto";
import { User } from "../../domain/entities/user.entity";
import { Email } from "../../domain/value-objects/email.vo";
import type { IUserRepository } from "../ports/user-repository.port";
import type { IAuthCredentialRepository } from "../ports/auth-credential-repository.port";
import type { IPasswordHasher } from "../ports/password-hasher.port";
import type { ITokenService } from "../ports/token-service.port";
import type { ILDAPService } from "../ports/ldap-service.port";
import type { LoginDto } from "../dtos/login.dto";
import type { AuthUserDto } from "../dtos/auth-response.dto";
import { InvalidCredentialsError, UserInactiveError } from "../errors";

export interface LoginResultDto {
  user: AuthUserDto;
  accessToken: string;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authCredentialRepository: IAuthCredentialRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly ldapService?: ILDAPService
  ) {}

  async execute(dto: LoginDto): Promise<LoginResultDto> {
    const identifier = dto.identifier || dto.email || dto.login;
    if (!identifier) {
      throw new InvalidCredentialsError("Invalid email or password");
    }

    const repo = this.userRepository as IUserRepository & {
      findByIdentifier?: (value: string) => Promise<Awaited<ReturnType<IUserRepository["findByEmail"]>>>;
      findByLogin?: (value: string) => Promise<Awaited<ReturnType<IUserRepository["findByEmail"]>>>;
    };

    let user = repo.findByIdentifier
      ? await repo.findByIdentifier(identifier)
      : identifier.includes("@")
        ? await this.userRepository.findByEmail(identifier)
        : repo.findByLogin
          ? await repo.findByLogin(identifier)
          : await this.userRepository.findByEmail(identifier);

    let isLdapVerified = false;

    if (!user) {
      // 1. User not found locally: attempt JIT provisioning via LDAP
      if (this.ldapService) {
        const ldapUser = await this.ldapService.authenticate(identifier, dto.password);
        if (ldapUser) {
          const users = await this.userRepository.findAll();
          const role = users.length === 0 ? "admin" : "user";
          const id = randomUUID();
          const emailObj = Email.create(ldapUser.email);
          const userEntity = User.create(id, emailObj, ldapUser.name, role, {
            login: ldapUser.login,
          });

          // Save user and publish user.created via Transactional Outbox
          await this.userRepository.saveUserAndOutbox(userEntity, {
            eventName: "user.created",
            payload: {
              userId: userEntity.id,
              email: userEntity.email.value,
              name: userEntity.name,
              occurredAt: userEntity.createdAt.toISOString(),
            },
          });

          user = userEntity;
          isLdapVerified = true;
        } else {
          throw new InvalidCredentialsError("Invalid email or password");
        }
      } else {
        throw new InvalidCredentialsError("Invalid email or password");
      }
    }

    if (user.status !== "active") {
      throw new UserInactiveError("User is inactive");
    }

    if (!isLdapVerified) {
      // 2. User exists locally: verify credentials
      let isValid = false;
      const hash = await this.authCredentialRepository.getPasswordHashByUserId(user.id);

      if (hash) {
        isValid = await this.passwordHasher.verify(dto.password, hash);
      }

      if (!isValid && this.ldapService) {
        // Fallback to LDAP verification
        const ldapUser = await this.ldapService.authenticate(identifier, dto.password);
        if (ldapUser) {
          isValid = true;
        }
      }

      if (!isValid) {
        throw new InvalidCredentialsError("Invalid email or password");
      }
    }

    const accessToken = this.tokenService.sign({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email.value,
        login: user.profile.login,
        name: user.name,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
      accessToken,
    };
  }
}
