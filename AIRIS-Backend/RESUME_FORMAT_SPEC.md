# AIRIS resume format: `airis-resume-v1`

This is an AIRIS structural/extraction specification based on the downloadable AIRIS Standard Resume Template. It is **not** an official Harvard or TIP standard, a hiring-quality judgment, or an ATS score. The current template is a static example PDF, not a fillable form.

## Expected structure

- A candidate name and at least one contact method (email, phone, or profile link) should be recoverable near the beginning. These are checked as resume content, not trusted as account identity.
- Education and Skills should be headed and populated with actual candidate information.
- At least one populated Projects, Work Experience, Internships, or Organizations/Leadership section should show the candidate's activity. Formal employment is **not** required of fresh graduates.
- Professional Summary, Certifications, Achievements, Relevant Coursework, Languages, and Trainings are optional. Omission of optional sections is not a format failure.
- Heading aliases and capitalization recognized by `resume_parser.SECTION_ALIASES` are accepted; order and extra sections do not automatically block analysis.
- A text-based, one-to-three-page PDF in a straightforward reading order is the supported format. DOCX, RTF, TXT, and image uploads remain accepted by the existing product, but receive a format warning. Scanned PDFs and complex columns/tables/header/footer content may be readable yet warned because extraction order may be uncertain. Colors alone are not a failure.

## Outcome policy

- `SUPPORTED`: required structure and essential information were recovered with no detected extraction-risk feature. This says nothing about role alignment or candidate quality.
- `WARNING`: readable content has missing expected fields/sections, non-PDF packaging, unrecognized headings, or detected extraction-risk layout. Mobile shows reasons and template recovery; the user can explicitly continue using the analysis returned for **that same upload**, or choose another file. No analysis record is saved on warning cancellation.
- `BLOCKED`: empty/corrupt/encrypted/unsupported/mismatched document, over limits, unreadable extraction, an unfilled template, or no meaningful candidate evidence. Analysis does not proceed.

Known exact template examples are treated as placeholders. Placeholder detection is intentionally narrow: it cannot certify the truth of supplied details. The separate resume-validity and name/account checks remain in force. The backend never auto-fills missing facts. A structurally valid resume may have no evidence for the selected role; role alignment remains a separate scoring concern.

## Bounds and limitations

The endpoint reads at most 15 MiB plus one byte, allows at most three PDF pages, and limits extracted text to 100,000 characters before scoring. DOCX archives are capped at 1,000 members and 50 MiB declared uncompressed size. PDF layout risk detection is heuristic and may not identify every multi-column design; OCR quality varies. Uploaded multipart data may be spooled by the web framework before endpoint-level checks. Institutional requirements beyond this AIRIS template were not established and must be approved before tightening the standard.

The API adds `formatAssessment` without changing scoring fields: `outcome`, `specificationVersion`, `reasonCodes`, `reasons`, `missingSections`, `unrecognizedSections`, `unrecoveredInformation`, `remediation`, `canProceed`, and `templateId`. `valid:false` remains the existing upload rejection signal; its `formatAssessment` provides structured recovery detail where available. Existing HTTP errors for missing target/unsupported extension remain unchanged.
