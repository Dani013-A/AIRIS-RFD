export function getMockResumeText(
  fullName: string,
  college: string,
  degreeProgram: string,
  targetPosition: string
): string {
  return `
${fullName}
Email: ${fullName.toLowerCase().replace(/\s+/g, ".")}@tip.edu.ph
Phone: 0917 123 4567
LinkedIn: linkedin.com/in/${fullName.toLowerCase().replace(/\s+/g, "")}
GitHub: github.com/${fullName.toLowerCase().replace(/\s+/g, "")}

OBJECTIVE
Highly motivated student from the Technological Institute of the Philippines - Manila, under the ${college}, seeking to prepare for a career as a ${targetPosition} to leverage my learnings in ${degreeProgram}.

EDUCATION
Technological Institute of the Philippines (T.I.P.) Manila
Bachelor of Science in ${degreeProgram}
Expected Graduation: 2026

SKILLS
Technical: Software Development, programming, database, api, testing, debugging
Tools: git, github, VS Code, Expo
Soft Skills: communication, teamwork, leadership

PROJECTS
AIRIS Mobile Application
Developed a mobile application using React Native and Firebase.
- Automated resume compatibility verification.
- Collaborated with 3 team members to implement Firestore rules.
  `;
}
