import { randomUUID } from "crypto";
import { User } from "../../domain/entities/user.entity";
import { Email } from "../../domain/value-objects/email.vo";
import { USER_CREATED_EVENT } from "@pgic/shared";
import type { IUserRepository } from "../ports/user-repository.port";
import type { IUserCreatedNotifier } from "../ports/user-created-notifier.port";
import type { CreateUserDto } from "../dtos/create-user.dto";
import type { UserResponseDto } from "../dtos/user-response.dto";
import { UserAlreadyExistsError, InvalidEmailError } from "../errors";

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userCreatedNotifier: IUserCreatedNotifier
  ) {}

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    let email: Email;
    try {
      email = Email.create(dto.email);
    } catch {
      throw new InvalidEmailError("Invalid email");
    }
    const existing = await this.userRepository.findByEmail(email.value);
    if (existing) {
      throw new UserAlreadyExistsError("User with this email already exists");
    }
    const login = (dto.login ?? dto.email.split("@")[0]).trim().toLowerCase();
    const findByLogin = (this.userRepository as IUserRepository & { findByLogin?: (login: string) => Promise<User | null> }).findByLogin;
    const existingLogin = findByLogin ? await findByLogin.call(this.userRepository, login) : null;
    if (existingLogin) {
      throw new UserAlreadyExistsError("User with this login already exists");
    }

    const id = randomUUID();
    const user = User.create(id, email, dto.name, dto.role ?? "user", {
      login,
      phone: dto.phone,
      department: dto.department,
      jobTitle: dto.jobTitle,
      photoUrl: dto.photoUrl,
      preferredLanguage: dto.preferredLanguage,
      timeZone: dto.timeZone,
    });
    await this.userRepository.saveUserAndOutbox(user, {
      eventName: USER_CREATED_EVENT,
      payload: {
        userId: user.id,
        email: user.email.value,
        name: user.name,
        occurredAt: user.createdAt.toISOString(),
      },
    });

    await this.userCreatedNotifier.notify({
      id: user.id,
      email: user.email.value,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    });

    const result: UserResponseDto = {
      id: user.id,
      email: user.email.value,
      login: user.profile.login,
      name: user.name,
      role: user.role,
      status: user.status,
      phone: user.profile.phone,
      department: user.profile.department,
      jobTitle: user.profile.jobTitle,
      photoUrl: user.profile.photoUrl,
      preferredLanguage: user.profile.preferredLanguage,
      timeZone: user.profile.timeZone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
    return result;
  }
}
