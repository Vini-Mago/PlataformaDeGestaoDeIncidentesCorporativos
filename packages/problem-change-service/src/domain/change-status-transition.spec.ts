import { describe, it, expect } from "vitest";
import { allowedChangeStatusTargets, canTransitionChangeStatus } from "./change-status-transition";

const cabOn = { cabHighRiskRequiresApprovalPath: true };
const cabOff = { cabHighRiskRequiresApprovalPath: false };

describe("change-status-transition (RF-7.3)", () => {
  it("allows Low/Medium Submitted -> Approved when CAB policy on", () => {
    expect(canTransitionChangeStatus("Submitted", "Approved", "Low", cabOn)).toBe(true);
    expect(canTransitionChangeStatus("Submitted", "Approved", "Medium", cabOn)).toBe(true);
  });

  it("blocks High Submitted -> Approved when CAB policy on", () => {
    expect(canTransitionChangeStatus("Submitted", "Approved", "High", cabOn)).toBe(false);
    expect(allowedChangeStatusTargets("Submitted", "High", cabOn)).not.toContain("Approved");
  });

  it("allows High Submitted -> InApproval", () => {
    expect(canTransitionChangeStatus("Submitted", "InApproval", "High", cabOn)).toBe(true);
  });

  it("allows High Submitted -> Approved when CAB policy off", () => {
    expect(canTransitionChangeStatus("Submitted", "Approved", "High", cabOff)).toBe(true);
  });

  it("allows Scheduled -> InProgress", () => {
    expect(canTransitionChangeStatus("Scheduled", "InProgress", "Low", cabOn)).toBe(true);
  });
});
