import { validateCareerRole } from "./careerValidator";
import { tipManilaPrograms } from "../../data/tipManilaPrograms";
import { evaluateCareerTargetCompatibility } from "./careerCompatibilityGuardrail";

describe("Career Target Search & Role Validation Suite", () => {
  it("Validates standard target roles for BS Information Technology", async () => {
    const result = await validateCareerRole("Information Technology Specialist", "BS Information Technology");
    expect(result.isValid).toBe(true);
  });

  it("Evaluates Information Technology Specialist as ALIGNED for BS Information Technology", () => {
    const comp = evaluateCareerTargetCompatibility("BS Information Technology", "Information Technology Specialist");
    expect(comp.classification).toBe("ALIGNED");
    expect(comp.requiresExplicitConfirmation).toBe(false);
  });

  it("Handles case-insensitive and partial role query matching", () => {
    const query = "specialist";
    const allCanonicalRoles = Array.from(
      new Set(tipManilaPrograms.flatMap((c) => c.programs.flatMap((p) => p.suggestedPositions)))
    );
    const matches = allCanonicalRoles.filter((r) => r.toLowerCase().includes(query));
    expect(matches.length).toBeGreaterThan(0);
    expect(matches).toContain("Information Technology Specialist");
  });
});
