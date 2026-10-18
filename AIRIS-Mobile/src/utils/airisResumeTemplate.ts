import { documentDirectory, EncodingType, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { generatePdfFromMarkdown } from "./pdfGenerator";

export function buildAirisResumeTemplate(): string {
  return `# YOUR NAME
Phone: +63 9XX XXX XXXX | Email: your.email@example.com
Location: City, Philippines

## PROFESSIONAL SUMMARY
Graduating Degree Program student preparing for entry-level opportunities as a Target Position. Replace this example with your own evidence-grounded summary.

## EDUCATION
Institution Name | City, Philippines
Degree Program | Expected Graduation: Month Year
- Relevant coursework: [List only relevant completed subjects]

## SKILLS
- Domain skills: [List skills you can demonstrate]
- Tools and software: [List tools you have used]

## PROJECTS
[Project Title] | Month Year - Month Year
- [Describe your action, method, and result in plain text]

## EXPERIENCE
[Internship, work, or relevant activity] | Month Year - Month Year
- [Describe your actual contribution and result]

## CERTIFICATIONS
- [List earned certifications, or remove this section if none]

## ACHIEVEMENTS
- [List relevant awards or leadership, or remove this section if none]
`;
}

export async function downloadAirisResumeTemplate(): Promise<string> {
  if (!documentDirectory) throw new Error("Document storage is unavailable on this device.");
  const fileName = "TIP_Standard_Resume_Template.pdf";
  const localUri = `${documentDirectory}${fileName}`;
  const pdf = generatePdfFromMarkdown("T.I.P. Standard Resume Template", buildAirisResumeTemplate());
  await writeAsStringAsync(localUri, pdf, { encoding: EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType: "application/pdf", dialogTitle: "T.I.P. Standard Resume Template" });
  }
  return localUri;
}
