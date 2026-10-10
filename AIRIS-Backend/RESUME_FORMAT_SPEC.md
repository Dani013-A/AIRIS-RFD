# AIRIS Resume Format Specification: `airis-resume-v1`

## 1. Overview and Identity

This specification defines the deterministic, evidence-based format assessment rules for AIRIS resumes. It evaluates whether an uploaded document can be parsed reliably into semantic resume sections before employability scoring begins.

Format assessment is **strictly decoupled** from:
- **ATS machine-readability scoring**: formatting hygiene, date consistency, and section clarity.
- **Target Competency Alignment**: evidence of skills matching the selected career path.
- **Employability preparedness**: overall candidate interview readiness.

A valid academic or single-column resume (such as Harvard, TIP, or standard IEEE styles) with populated information must be evaluated as `SUPPORTED`. Format assessment never judges candidate qualification; it assesses document extractability and structural compatibility.

---

## 2. The Six Independent Validation Dimensions

Every assessment evaluates six distinct dimensions rather than computing an opaque composite score:

### Dimension 1: File Validity and Integrity (`fileValidity`)
- **Status**: `PASS` | `FAIL`
- **Scope**: Verifies container format, magic bytes signature, MIME type, file size (maximum 15 MiB), password encryption, and page bounds (maximum 3 pages for PDF).
- **Hard Invariant**: If file validity fails, assessment is `BLOCKED` and processing halts immediately.

### Dimension 2: Text Extraction Quality (`textQuality`)
- **Status**: `PASS` | `WARNING` | `FAIL`
- **Scope**: Evaluates selectable text density, printable character ratio, unmapped glyphs, and character volume (30 to 100,000 characters).
- **Fallback**: Pages with `< 30` text characters or degraded glyph encoding automatically trigger page-level OCR (Tesseract / Multimodal Vision).
- **Severity**: Direct selectable text yields `PASS`. Scanned PDFs requiring OCR yield a `WARNING` (`SCANNED_PDF`) to indicate potential transcription noise. Empty or corrupt extraction yields `FAIL` (`UNREADABLE`).

### Dimension 3: Content Completeness (`contentCompleteness`)
- **Status**: `PASS` | `WARNING` | `FAIL`
- **Scope**: Verifies presence of essential candidate credentials:
  1. Candidate name recoverable in document header block.
  2. Contact channel (email, phone, or verified profile URL).
  3. Core sections: `Education` and `Skills`.
  4. Activity/Experience evidence: at least one of `Projects`, `WorkExperience`, `Internships`, or `OrganizationsLeadership`.
- **Severity**: Missing optional sections (e.g. Summary, Certifications, Awards, Coursework) is never penalized. Missing core sections produces a non-blocking `WARNING`. Documents lacking both core sections and activity evidence are `BLOCKED` (`INSUFFICIENT_CONTENT`).

### Dimension 4: Academic Format Compatibility (`formatCompatibility`)
- **Status**: `PASS` | `WARNING` | `FAIL`
- **Scope**: Verifies recognized section headings against `SECTION_ALIASES` (including Harvard academic synonyms like *Core Strengths*, *Selected Projects*, *Career Focus*, *Academic Formation*).
- **Heading Hygiene**: Standalone candidate names, contact header lines, degree titles, university names, job titles, and programming languages are strictly excluded from unrecognized headings.
- **Severity**: Non-PDF uploads receive a `WARNING` (`NON_PDF`). True unrecognized headings receive `WARNING` (`UNRECOGNIZED_SECTIONS`) while allowing analysis to proceed.

### Dimension 5: Layout Confidence (`layoutConfidence`)
- **Status**: `PASS` | `WARNING`
- **Scope**: Evaluates reading order reliability. Single-column layouts yield `PASS` with high confidence. Multi-column documents (side-by-side substantial blocks with overlapping vertical spans) or complex tables yield `WARNING` (`COMPLEX_LAYOUT`).
- **Severity**: Layout warnings inform the user that reading order may vary, but do not block analysis.

### Dimension 6: Analysis Eligibility (`analysisEligibility`)
- **Outcome**: `SUPPORTED` | `WARNING` | `BLOCKED`
- **`canProceed` Contract**:
  - `SUPPORTED`: `canProceed = True`. Document is fully compatible; analysis proceeds automatically.
  - `WARNING`: `canProceed = True`. Nonfatal warning detected; candidate may proceed or choose another file.
  - `BLOCKED`: `canProceed = False`. Document is unreadable, invalid, or empty; analysis cannot proceed.

---

## 3. Reason Code Catalog and Rubric

| Code | Severity | Dimension | Evidence Requirement | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `UNSUPPORTED_TYPE` | `BLOCKED` | `fileValidity` | File extension is not in supported set (`.pdf`, `.docx`, `.rtf`, `.txt`, images). | Upload a supported format (PDF preferred). |
| `EXTENSION_MISMATCH` | `BLOCKED` | `fileValidity` | Magic bytes signature does not match declared file extension. | Re-export the document as a clean PDF. |
| `FILE_TOO_LARGE` | `BLOCKED` | `fileValidity` | File size exceeds 15 MiB processing limit. | Compress or re-export document under 15 MiB. |
| `PAGE_LIMIT` | `BLOCKED` | `fileValidity` | PDF document exceeds three pages. | Upload a 1–3 page fresh graduate resume. |
| `INVALID_DOCUMENT` | `BLOCKED` | `fileValidity` | Document is password-encrypted or corrupt container. | Remove password protection or repair document. |
| `UNREADABLE` | `BLOCKED` | `textQuality` | Extracted text is empty or fewer than 30 characters after fallbacks. | Ensure the file contains selectable text or clear image. |
| `TEXT_TOO_LARGE` | `BLOCKED` | `textQuality` | Extracted text exceeds 100,000 characters. | Remove embedded logs or appendices from resume. |
| `PLACEHOLDER_ONLY` | `BLOCKED` | `contentCompleteness` | Document contains unmodified AIRIS template placeholders (>= 5). | Replace template examples with real student information. |
| `INSUFFICIENT_CONTENT` | `BLOCKED` | `contentCompleteness` | Neither core sections nor experience evidence found. | Include education, skills, and projects in resume. |
| `MISSING_NAME` | `WARNING` | `contentCompleteness` | Candidate name could not be recovered in header block. | Add candidate full name at top of resume. |
| `MISSING_CONTACT` | `WARNING` | `contentCompleteness` | No usable email, phone, or profile link recovered. | Add email or phone number in contact header. |
| `MISSING_EDUCATION` | `WARNING` | `contentCompleteness` | Education section missing or empty. | Add an Education section with school and degree. |
| `MISSING_SKILLS` | `WARNING` | `contentCompleteness` | Skills section missing or empty. | Add a Skills section with technical competencies. |
| `MISSING_EXPERIENCE_EVIDENCE` | `WARNING` | `contentCompleteness` | No Projects, Experience, Internships, or Leadership found. | Add at least one project, internship, or activity. |
| `NON_PDF` | `WARNING` | `formatCompatibility` | Upload is readable DOCX, RTF, TXT, or image. | Accepted, but export to selectable PDF for best ATS results. |
| `SCANNED_PDF` | `WARNING` | `textQuality` | PDF required OCR due to scanned/image pages. | Accepted, but direct selectable PDF yields higher accuracy. |
| `COMPLEX_LAYOUT` | `WARNING` | `layoutConfidence` | Multi-column, tables, or complex layout detected. | Accepted, but single-column layout ensures strict reading order. |
| `UNRECOGNIZED_SECTIONS` | `WARNING` | `formatCompatibility` | Document contains non-standard section headings. | Align section headings with standard employability conventions. |

---

## 4. API Contract and Backward Compatibility

The endpoint returns `formatAssessment` with all ten existing top-level fields preserved:

```json
{
  "outcome": "SUPPORTED",
  "specificationVersion": "airis-resume-v1",
  "reasonCodes": [],
  "reasons": [],
  "missingSections": [],
  "unrecognizedSections": [],
  "unrecoveredInformation": [],
  "remediation": "No format changes required.",
  "canProceed": true,
  "templateId": "airis_standard",
  "extractionMethod": "embedded",
  "dimensions": {
    "fileValidity": {
      "status": "PASS",
      "extension": ".pdf",
      "pageCount": 1,
      "isProtected": false,
      "details": "File integrity and container format check passed."
    },
    "textQuality": {
      "status": "PASS",
      "characterCount": 1898,
      "pageCount": 1,
      "extractionMethod": "embedded",
      "isScanned": false,
      "details": "Selectable text extracted directly from document."
    },
    "contentCompleteness": {
      "status": "PASS",
      "candidateNameDetected": true,
      "contactDetected": true,
      "requiredSectionsPresent": ["Education", "Skills", "Projects"],
      "missingRequiredSections": [],
      "unrecoveredInformation": []
    },
    "formatCompatibility": {
      "status": "PASS",
      "isStandardAcademic": true,
      "isPlaceholderOnly": false,
      "recognizedSections": ["Content", "ContactInformation", "ProfessionalSummary", "Education", "Skills", "Projects"],
      "unrecognizedSections": [],
      "isPdf": true
    },
    "layoutConfidence": {
      "status": "PASS",
      "complexLayout": false,
      "readingOrderReliable": true,
      "details": "Single-column sequential layout."
    },
    "analysisEligibility": {
      "canProceed": true,
      "status": "SUPPORTED",
      "reasonCodes": [],
      "reasons": [],
      "remediation": "No format changes required."
    }
  }
}
```

Mobile clients safely inspect `outcome`, `canProceed`, and `reasons` as before, while advanced views can inspect granular dimensional diagnostics.
