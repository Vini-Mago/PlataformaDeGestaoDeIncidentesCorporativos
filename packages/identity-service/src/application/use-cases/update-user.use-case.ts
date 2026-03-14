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
    let name = existing.name;

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

    if (dto.name !== undefined) {
      name = dto.name.trim();
      if (!name) {
        throw new InvalidNameError("Name cannot be empty");
      }
    }

    const updated = User.reconstitute(id, email.value, name, existing.createdAt, existing.role);

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
      name: updated.name,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
