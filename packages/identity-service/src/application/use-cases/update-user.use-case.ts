import { User } from "../../domain/entities/user.entity";
import { Email } from "../../domain/value-objects/email.vo";
import { USER_UPDATED_EVENT } from "@pgic/shared";
import type { IUserRepository } from "../ports/user-repository.port";
import type { UpdateUserDto } from "../dtos/update-user.dto";
import type { UserResponseDto } from "../dtos/user-response.dto";
import { UserNotFoundError, UserAlreadyExistsError, InvalidEmailError, InvalidNameError } from "../errors";

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new UserNotFoundError(id);
    }

    let email = existing.email;
    let login = existing.profile.login;
    let name = existing.name;
    let role = existing.role;
    let status = existing.status;
    const phone = dto.phone === undefined ? existing.profile.phone : dto.phone;
    const department = dto.department === undefined ? existing.profile.department : dto.department;
    const jobTitle = dto.jobTitle === undefined ? existing.profile.jobTitle : dto.jobTitle;
    const photoUrl = dto.photoUrl === undefined ? existing.profile.photoUrl : dto.photoUrl;
    const preferredLanguage =
      dto.preferredLanguage === undefined ? existing.profile.preferredLanguage : dto.preferredLanguage;
    const timeZone = dto.timeZone === undefined ? existing.profile.timeZone : dto.timeZone;

    if (dto.email !== undefined) {
      try {
        email = Email.create(dto.email);
      } catch {
        throw new InvalidEmailError("Invalid email");
      }
      if (email.value !== existing.email.value) {
        const other = await this.userRepository.findByEmail(email.value);
        if (other) {
          throw new UserAlreadyExistsError("User with this email already exists");
        }
      }
    }

    if (dto.login !== undefined) {
      login = dto.login.trim().toLowerCase();
      if (login !== existing.profile.login) {
        const other = await this.userRepository.findByLogin(login);
        if (other) {
          throw new UserAlreadyExistsError("User with this login already exists");
        }
      }
    }

    if (dto.name !== undefined) {
      name = dto.name.trim();
      if (!name) {
        throw new InvalidNameError("Name cannot be empty");
      }
    }

    if (dto.role !== undefined) {
      role = dto.role.trim();
    }

    if (dto.status !== undefined) {
      status = dto.status;
    }

    const updated = User.reconstitute(
      id,
      email.value,
      name,
      existing.createdAt,
      role,
      new Date(),
      status,
      {
        login,
        phone,
        department,
        jobTitle,
        photoUrl,
        preferredLanguage,
        timeZone,
      }
    );

    await this.userRepository.saveUserAndOutbox(updated, {
      eventName: USER_UPDATED_EVENT,
      payload: {
        userId: updated.id,
        email: updated.email.value,
        name: updated.name,
        occurredAt: new Date().toISOString(),
      },
    });

    return {
      id: updated.id,
      email: updated.email.value,
      login: updated.profile.login,
      name: updated.name,
      role: updated.role,
      status: updated.status,
      phone: updated.profile.phone,
      department: updated.profile.department,
      jobTitle: updated.profile.jobTitle,
      photoUrl: updated.profile.photoUrl,
      preferredLanguage: updated.profile.preferredLanguage,
      timeZone: updated.profile.timeZone,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
