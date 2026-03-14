import type { IUserRepository } from "../ports/user-repository.port";
import type { ICacheService } from "@pgic/shared";
import { UserNotFoundError } from "../errors";
import { userResponseDtoSchema, type UserResponseDto } from "../dtos/user-response.dto";

export class GetUserByIdUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cache: ICacheService
  ) {}

  async execute(id: string): Promise<UserResponseDto> {
    const cacheKey = `user:${id}`;
    const cached = await this.cache.get(cacheKey, userResponseDtoSchema);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    const dto: UserResponseDto = {
      id: user.id,
      email: user.email.value,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };

    await this.cache.set(cacheKey, dto, 300);
    return dto;
  }
}
