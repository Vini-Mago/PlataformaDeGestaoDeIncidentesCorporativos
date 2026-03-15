import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ListProblemsUseCase,
  parseProblemStatusFilter,
} from "./list-problems.use-case";
import { InvalidProblemStatusFilterError } from "../errors";
import type { IProblemRepository } from "../ports/problem-repository.port";

describe("ListProblemsUseCase", () => {
  let problemRepository: IProblemRepository;

  beforeEach(() => {
    problemRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
  });

  it("calls repository with filters", async () => {
    const useCase = new ListProblemsUseCase(problemRepository);
    await useCase.execute({
      status: "Open",
      createdById: "u1",
    });

    expect(problemRepository.list).toHaveBeenCalledWith({
      status: "Open",
      createdById: "u1",
    });
  });

  it("passes valid status to repository", async () => {
    const useCase = new ListProblemsUseCase(problemRepository);
    await useCase.execute({ status: "Resolved" });

    expect(problemRepository.list).toHaveBeenCalledWith({ status: "Resolved" });
  });
});

describe("parseProblemStatusFilter", () => {
  it("returns undefined for empty string", () => {
    expect(parseProblemStatusFilter("")).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(parseProblemStatusFilter(undefined)).toBeUndefined();
  });

  it("returns status for valid value", () => {
    expect(parseProblemStatusFilter("Open")).toBe("Open");
    expect(parseProblemStatusFilter("InAnalysis")).toBe("InAnalysis");
    expect(parseProblemStatusFilter("Resolved")).toBe("Resolved");
    expect(parseProblemStatusFilter("Closed")).toBe("Closed");
  });

  it("throws InvalidProblemStatusFilterError for invalid status", () => {
    expect(() => parseProblemStatusFilter("InvalidStatus")).toThrow(
      InvalidProblemStatusFilterError
    );
    expect(() => parseProblemStatusFilter("InvalidStatus")).toThrow(
      "Invalid problem status filter: InvalidStatus"
    );
  });
});
