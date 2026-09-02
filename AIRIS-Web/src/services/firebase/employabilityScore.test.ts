import { calculateEmployabilityScore } from "./userService";

describe("Employability Preparedness Score Canonical Calculation", () => {
  // Scenario 1: Resume exists + Interview exists -> calculate 40/60 composite
  it("calculates 40/60 composite when both Resume ATS score and Interview score exist and interview is completed", () => {
    const resumeScore = 90;
    const interviewScore = 80;
    const interviewStatus = "completed";

    // Expected: 90 * 0.40 + 80 * 0.60 = 36 + 48 = 84
    const score = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);
    expect(score).toBe(84);
  });

  // Scenario 2: Resume exists + Interview not started -> no fabricated composite
  it("returns undefined (Not Yet Evaluated) when Interview is not started, avoiding fabricated composites", () => {
    const resumeScore = 94;
    const interviewScore = 0;
    const interviewStatus = "not_started";

    const score = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);
    expect(score).toBeUndefined();
  });

  // Scenario 3: Resume exists + Interview score exists -> exact deterministic calculation
  it("performs exact deterministic calculation for arbitrary valid scores", () => {
    const resumeScore = 75;
    const interviewScore = 85;
    const interviewStatus = "completed";

    // Expected: 75 * 0.40 + 85 * 0.60 = 30 + 51 = 81
    const score = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);
    expect(score).toBe(81);
  });

  // Scenario 4: Different resume/interview sessions -> do not mix scores
  it("isolates calculations to active user session scores and does not mix mismatched sessions", () => {
    const student1Resume = 100;
    const student1Interview = 50; // 100*0.4 + 50*0.6 = 40 + 30 = 70

    const student2Resume = 60;
    const student2Interview = 90; // 60*0.4 + 90*0.6 = 24 + 54 = 78

    expect(calculateEmployabilityScore(student1Resume, student1Interview, "completed")).toBe(70);
    expect(calculateEmployabilityScore(student2Resume, student2Interview, "completed")).toBe(78);
  });

  // Scenario 5: Stale historical score -> do not present orphan userData.interviewScore when 0 completed interviews exist
  it("ignores stale orphan interview scores when interviewStatus is not_started", () => {
    const resumeScore = 94;
    const staleOrphanInterviewScore = 41; // Daniel's orphan field
    const interviewStatus = "not_started"; // 0 completed interview docs exist

    const score = calculateEmployabilityScore(resumeScore, staleOrphanInterviewScore, interviewStatus);
    expect(score).toBeUndefined(); // Must NOT produce 62
  });

  // Scenario 6: ATS sub-score vs Employability Preparedness Score
  it("does not substitute single resume ATS score as the composite Employability Preparedness Score", () => {
    const resumeAtsScore = 94;
    const interviewScore = undefined;
    const interviewStatus = "not_started";

    const score = calculateEmployabilityScore(resumeAtsScore, interviewScore, interviewStatus);
    expect(score).toBeUndefined(); // Does NOT fall back to 94
  });
});
