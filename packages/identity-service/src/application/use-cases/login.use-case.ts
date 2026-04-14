import type { IUserRepository } from "../ports/user-repository.port";
import type { IAuthCredentialRepository } from "../ports/auth-credential-repository.port";
import type { IPasswordHasher } from "../ports/password-hasher.port";
import type { ITokenService } from "../ports/token-service.port";
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
    private readonly tokenService: ITokenService
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
    const user = repo.findByIdentifier
      ? await repo.findByIdentifier(identifier)
      : identifier.includes("@")
        ? await this.userRepository.findByEmail(identifier)
        : repo.findByLogin
          ? await repo.findByLogin(identifier)
          : await this.userRepository.findByEmail(identifier);
    if (!user) {
      throw new InvalidCredentialsError("Invalid email or password");
    }
    if (user.status !== "active") {
      throw new UserInactiveError("User is inactive");
    }

    const hash = await this.authCredentialRepository.getPasswordHashByUserId(user.id);
    if (!hash) {
      throw new InvalidCredentialsError("Invalid email or password");
    }

    const valid = await this.passwordHasher.verify(dto.password, hash);
    if (!valid) {
      throw new InvalidCredentialsError("Invalid email or password");
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
        name: user.name,
      },
      accessToken,
    };
  }
}
