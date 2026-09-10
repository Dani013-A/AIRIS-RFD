import { parseAndBuildStructuredData } from "./resumeParser";
import { tipManilaCollegePrograms } from "../../data/tipManilaPrograms";

describe("Resume Parser & Academic Catalog Regression Tests", () => {
  it("extracts pipe-delimited skills into individual normalized skill items", () => {
    const rawResumeText = `
JUAN DELA CRUZ
juan@gmail.com | +639171234567

TECHNICAL SKILLS
Python | Java | SQL | React | Node.js | Git | Docker | AWS

WORK EXPERIENCE
Software Developer | Global Tech Solutions (2024-2025)
- Developed REST API endpoints in Node.js and SQL
`;

    const result = parseAndBuildStructuredData(rawResumeText);
    expect(result.skills).toBeDefined();
    expect(result.skills).toContain("Python");
    expect(result.skills).toContain("Java");
    expect(result.skills).toContain("SQL");
    expect(result.skills).toContain("React");
    expect(result.skills).toContain("Node.js");
    expect(result.skills).toContain("Git");
    expect(result.skills).toContain("Docker");
    expect(result.skills).toContain("AWS");
    // Must NOT be grouped as a single monster 8-skill string
    expect(result.skills).not.toContain("Python | Java | SQL | React | Node.js | Git | Docker | AWS");

    // Negative check: Work Experience header intact
    expect(result.workExperience).toBeDefined();
    expect(result.workExperience![0].description).toContain("Software Developer | Global Tech Solutions");
  });

  it("handles arbitrary common skill list delimiters (comma, semicolon, bullet, slash, newline)", () => {
    const skillVariants = [
      "Python, Java, SQL, React",
      "Python; Java; SQL; React",
      "Python • Java • SQL • React",
      "Python / Java / SQL / React",
      "Python\nJava\nSQL\nReact",
    ];

    for (const variant of skillVariants) {
      const rawText = `
JUAN DELA CRUZ
Email: juan.delacruz@tip.edu.ph | Phone: 09171234567

EDUCATION
Bachelor of Science in Computer Science - TIP Manila

WORK EXPERIENCE
Software Developer Intern - Tech Solutions (2025)
- Developed responsive software features using modern tools and web technologies.

SKILLS
${variant}
`;
      const parsed = parseAndBuildStructuredData(rawText);
      expect(parsed.skills).toBeDefined();
      expect(parsed.skills).toContain("Python");
      expect(parsed.skills).toContain("Java");
      expect(parsed.skills).toContain("SQL");
      expect(parsed.skills).toContain("React");
    }
  });

  it("ensures Senior High School is excluded from college-level catalog export tipManilaCollegePrograms", () => {
    const collegeNames = tipManilaCollegePrograms.map((c) => c.name);
    expect(collegeNames).not.toContain("Senior High School");
    expect(collegeNames).toContain("College of Computer Studies");
    expect(collegeNames).toContain("College of Engineering and Architecture");
    expect(collegeNames).toContain("College of Business Education");
    expect(collegeNames).toContain("College of Arts");
  });
});
