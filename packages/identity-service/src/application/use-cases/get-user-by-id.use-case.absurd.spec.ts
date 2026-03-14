import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetUserByIdUseCase } from "./get-user-by-id.use-case";
import { UserNotFoundError } from "../errors";
import type { IUserRepository } from "../ports/user-repository.port";
import type { ICacheService } from "@pgic/shared";

describe("GetUserByIdUseCase — cenários absurdos", () => {
  let userRepository: IUserRepository;
  let cache: ICacheService;

  beforeEach(() => {
    userRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
    };
    cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
    };
  });

  it("lança UserNotFoundError ao receber string vazia como id (não explode)", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);
    const useCase = new GetUserByIdUseCase(userRepository, cache);
    await expect(useCase.execute("")).rejects.toThrow(UserNotFoundError);
    expect(userRepository.findById).toHaveBeenCalledWith("");
  });

  it("lança UserNotFoundError ao receber id com apenas espaços (não explode)", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);
    const useCase = new GetUserByIdUseCase(userRepository, cache);
    await expect(useCase.execute("   ")).rejects.toThrow(UserNotFoundError);
    expect(userRepository.findById).toHaveBeenCalledWith("   ");
  });

  it("lança UserNotFoundError ao receber id com caracteres especiais (não explode)", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);
    const useCase = new GetUserByIdUseCase(userRepository, cache);
    await expect(useCase.execute("../../etc/passwd")).rejects.toThrow(UserNotFoundError);
    expect(userRepository.findById).toHaveBeenCalledWith("../../etc/passwd");
  });

  it("lança UserNotFoundError ao receber id muito longo (não explode)", async () => {
    const idLongo = "a".repeat(10_000);
    vi.mocked(userRepository.findById).mockResolvedValue(null);
    const useCase = new GetUserByIdUseCase(userRepository, cache);
    await expect(useCase.execute(idLongo)).rejects.toThrow(UserNotFoundError);
    expect(userRepository.findById).toHaveBeenCalledWith(idLongo);
  });
});
