/**
 * Deterministically calculates the canonical Employability Preparedness Score.
 * Formula: (Interview Score × 0.60) + (Resume ATS Score × 0.40)
 */
export function calculateEmployabilityScore(
  resumeScore?: number,
  interviewScore?: number,
  interviewStatus?: string
): number | undefined {
  if (
    resumeScore &&
    resumeScore > 0 &&
    interviewScore &&
    interviewScore > 0 &&
    interviewStatus === "completed"
  ) {
    return Math.round(resumeScore * 0.40 + interviewScore * 0.60);
  }
  return undefined;
}

describe("Employability Preparedness Score Invariants & Root-Cause Remediation", () => {
  // 1. Resume exists + Interview exists -> calculate 40/60 composite
  it("Scenario 1: calculates 40/60 composite when both Resume ATS score (90) and Interview score (80) exist", () => {
    const resumeScore = 90;
    const interviewScore = 80;
    const interviewStatus = "completed";

    // Expected: 90 * 0.40 + 80 * 0.60 = 36 + 48 = 84
    const score = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);
    expect(score).toBe(84);
  });

  // 2. Resume exists + Interview not started -> no fabricated composite
  it("Scenario 2: returns undefined (Not Yet Evaluated) when Interview is not started, rejecting fabricated composites", () => {
    const resumeScore = 94;
    const interviewScore = 0;
    const interviewStatus = "not_started";

    const score = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);
    expect(score).toBeUndefined();
  });

  // 3. Resume exists + Interview score exists -> exact deterministic calculation
  it("Scenario 3: performs exact deterministic calculation for arbitrary valid scores (75 ATS, 85 Interview)", () => {
    const resumeScore = 75;
    const interviewScore = 85;
    const interviewStatus = "completed";

    // Expected: 75 * 0.40 + 85 * 0.60 = 30 + 51 = 81
    const score = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);
    expect(score).toBe(81);
  });

  // 4. Different resume/interview sessions -> do not mix scores
  it("Scenario 4: isolates calculations per candidate session and does not mix mismatched user scores", () => {
    const candidateAResume = 100;
    const candidateAInterview = 50; // 100*0.4 + 50*0.6 = 40 + 30 = 70

    const candidateBResume = 60;
    const candidateBInterview = 90; // 60*0.4 + 90*0.6 = 24 + 54 = 78

    expect(calculateEmployabilityScore(candidateAResume, candidateAInterview, "completed")).toBe(70);
    expect(calculateEmployabilityScore(candidateBResume, candidateBInterview, "completed")).toBe(78);
  });

  // 5. Stale historical score -> do not present orphan userData.interviewScore when 0 completed interviews exist
  it("Scenario 5: ignores stale orphan interview scores (e.g. 41) when interviewStatus is not_started", () => {
    const resumeScore = 94;
    const staleOrphanInterviewScore = 41; // Daniel's root cause field
    const interviewStatus = "not_started"; // 0 completed interview docs exist

    const score = calculateEmployabilityScore(resumeScore, staleOrphanInterviewScore, interviewStatus);
    expect(score).toBeUndefined(); // Must NOT produce 62
  });

  // 6. ATS/resume sub-score must not be confused with Employability Preparedness Score
  it("Scenario 6: does not substitute single resume ATS score as the composite Employability Preparedness Score", () => {
    const resumeAtsScore = 94;
    const interviewScore = undefined;
    const interviewStatus = "not_started";

    const score = calculateEmployabilityScore(resumeAtsScore, interviewScore, interviewStatus);
    expect(score).toBeUndefined(); // Does NOT fall back to 94
  });
});
