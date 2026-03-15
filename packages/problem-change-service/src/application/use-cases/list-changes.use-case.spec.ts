import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ListChangesUseCase,
  parseChangeStatusFilter,
  parseChangeRiskFilter,
} from "./list-changes.use-case";
import { InvalidChangeStatusFilterError, InvalidChangeRiskFilterError } from "../errors";
import type { IChangeRepository } from "../ports/change-repository.port";

describe("ListChangesUseCase", () => {
  let changeRepository: IChangeRepository;

  beforeEach(() => {
    changeRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
  });

  it("calls repository with filters", async () => {
    const useCase = new ListChangesUseCase(changeRepository);
    await useCase.execute({
      status: "Draft",
      createdById: "u1",
      risk: "High",
    });

    expect(changeRepository.list).toHaveBeenCalledWith({
      status: "Draft",
      createdById: "u1",
      risk: "High",
    });
  });
});

describe("parseChangeStatusFilter", () => {
  it("returns undefined for empty string", () => {
    expect(parseChangeStatusFilter("")).toBeUndefined();
  });

  it("returns status for valid value", () => {
    expect(parseChangeStatusFilter("Draft")).toBe("Draft");
    expect(parseChangeStatusFilter("Completed")).toBe("Completed");
  });

  it("throws InvalidChangeStatusFilterError for invalid status", () => {
    expect(() => parseChangeStatusFilter("Invalid")).toThrow(
      InvalidChangeStatusFilterError
    );
    expect(() => parseChangeStatusFilter("Invalid")).toThrow(
      "Invalid change status filter: Invalid"
    );
  });
});

describe("parseChangeRiskFilter", () => {
  it("returns undefined for empty string", () => {
    expect(parseChangeRiskFilter("")).toBeUndefined();
  });

  it("returns risk for valid value", () => {
    expect(parseChangeRiskFilter("Low")).toBe("Low");
    expect(parseChangeRiskFilter("Medium")).toBe("Medium");
    expect(parseChangeRiskFilter("High")).toBe("High");
  });

  it("throws InvalidChangeRiskFilterError for invalid risk", () => {
    expect(() => parseChangeRiskFilter("Critical")).toThrow(
      InvalidChangeRiskFilterError
    );
    expect(() => parseChangeRiskFilter("Critical")).toThrow(
      "Invalid change risk filter: Critical"
    );
  });
});
