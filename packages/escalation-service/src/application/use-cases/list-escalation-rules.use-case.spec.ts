import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ListEscalationRulesUseCase,
  parseTicketTypeFilter,
  parseTicketTypeFilterOrThrow,
} from "./list-escalation-rules.use-case";
import { InvalidTicketTypeError } from "../errors";
import type { IEscalationRuleRepository } from "../ports/escalation-rule-repository.port";

describe("ListEscalationRulesUseCase", () => {
  let escalationRuleRepository: IEscalationRuleRepository;

  beforeEach(() => {
    escalationRuleRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
  });

  it("lists rules with no filters", async () => {
    const useCase = new ListEscalationRulesUseCase(escalationRuleRepository);
    await useCase.execute({});
    expect(escalationRuleRepository.list).toHaveBeenCalledWith({});
  });

  it("lists rules with ticketType and isActive filters", async () => {
    const useCase = new ListEscalationRulesUseCase(escalationRuleRepository);
    await useCase.execute({ ticketType: "incident", isActive: true });
    expect(escalationRuleRepository.list).toHaveBeenCalledWith({
      ticketType: "incident",
      isActive: true,
    });
  });
});

describe("parseTicketTypeFilter", () => {
  it("returns undefined for undefined or null", () => {
    expect(parseTicketTypeFilter(undefined)).toBeUndefined();
    expect(parseTicketTypeFilter(null)).toBeUndefined();
  });

  it("returns incident or request for valid strings", () => {
    expect(parseTicketTypeFilter("incident")).toBe("incident");
    expect(parseTicketTypeFilter("request")).toBe("request");
    expect(parseTicketTypeFilter("INCIDENT")).toBe("incident");
  });

  it("returns undefined for invalid value", () => {
    expect(parseTicketTypeFilter("invalid")).toBeUndefined();
  });
});

describe("parseTicketTypeFilterOrThrow", () => {
  it("returns undefined for undefined or null", () => {
    expect(parseTicketTypeFilterOrThrow(undefined)).toBeUndefined();
    expect(parseTicketTypeFilterOrThrow(null)).toBeUndefined();
  });

  it("returns ticket type for valid strings", () => {
    expect(parseTicketTypeFilterOrThrow("incident")).toBe("incident");
    expect(parseTicketTypeFilterOrThrow("request")).toBe("request");
  });

  it("throws InvalidTicketTypeError for invalid value", () => {
    expect(() => parseTicketTypeFilterOrThrow("invalid")).toThrow(InvalidTicketTypeError);
    expect(() => parseTicketTypeFilterOrThrow("invalid")).toThrow(/Invalid ticket type/);
  });
});
