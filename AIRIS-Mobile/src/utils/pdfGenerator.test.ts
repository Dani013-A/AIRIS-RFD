import { generatePdfFromMarkdown } from "./pdfGenerator";

describe("T.I.P. standard resume PDF", () => {
  it("wraps long body text without dropping sections", () => {
    const longLine = "Graduating students can document relevant projects and experience while keeping contact information and skills as selectable text for resume analysis.";
    const pdf = generatePdfFromMarkdown("T.I.P. Standard Resume Template", `## EDUCATION\n${longLine}\n## SKILLS\nPython, SQL`);
    expect(pdf).toContain("%PDF-1.4");
    for (const heading of ["EDUCATION", "SKILLS"]) {
      expect(pdf).toContain(`(${heading}) Tj`);
    }
    expect(pdf).toContain("Graduating students can document relevant projects");
    expect(pdf).not.toContain(`(${longLine}) Tj`);
  });
});
