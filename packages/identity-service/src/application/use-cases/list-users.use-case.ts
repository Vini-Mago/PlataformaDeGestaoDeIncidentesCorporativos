import type { IUserRepository } from "../ports/user-repository.port";
import type { User } from "../../domain/entities/user.entity";

export class ListUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute() {
    const users = await this.userRepository.findAll();
    return users.map((u: User) => ({
      id: u.id,
      email: u.email.value,
      name: u.name,
      role: u.role,
      status: u.status,
      login: u.profile.login,
      department: u.profile.department,
      jobTitle: u.profile.jobTitle,
      createdAt: u.createdAt,
    }));
  }
}
