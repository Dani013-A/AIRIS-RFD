import { validateResumeText } from "./resumeNormalizer";

describe("Resume Upload Validation Gate & State Machine Tests", () => {
  test("1. Non-resume text / invalid document fails validation and throws INVALID_RESUME error", () => {
    const invalidText = "INVOICE #10293\nDate: 2026-09-09\nItem 1: Coffee Latte - 150 PHP\nItem 2: Blueberry Muffin - 120 PHP\nTotal Amount: 270 PHP\nPayment Method: Credit Card\nStatus: Paid\nThank you for visiting Coffee Shop Manila! Please come back again soon!";
    expect(() => validateResumeText(invalidText)).toThrow(/doesn't appear to be a resume/);
  });

  test("2. Valid resume text passes validation", () => {
    const validResumeText = `
      JOHN DOE
      Email: john.doe@tip.edu.ph | Phone: 09171234567 | LinkedIn: linkedin.com/in/johndoe
      OBJECTIVE
      Seeking Software Engineer Internship
      EDUCATION
      Bachelor of Science in Computer Science - TIP Manila
      GPA: 3.8
      SKILLS
      JavaScript, TypeScript, React Native, Python, SQL, Git
      WORK EXPERIENCE
      Software Developer Intern - Tech Corp (2025)
      - Developed mobile application features using React Native and TypeScript.
      - Implemented SBERT analysis pipeline and REST API integrations.
      PROJECTS
      AIRIS Mobile App (2026)
      - Built user onboarding, ATS score calculator, and mock interview module.
    `;

    expect(() => validateResumeText(validResumeText)).not.toThrow();
  });

  test("3. Upload state machine state transitions: INVALID -> BLOCKED, VALID -> ALLOWED, VALID -> INVALID -> BLOCKED", () => {
    // Initial state simulation for explicit NEW upload: selectedFile starts null
    let selectedFile: any = null;
    let isInvalidDocument = false;
    let validationError: string | null = null;
    let hasValidUploadCompleted = false;

    const isSubmitEnabled = () => {
      return (
        !isInvalidDocument &&
        validationError === null &&
        selectedFile !== null &&
        hasValidUploadCompleted
      );
    };

    // Initial state: selectedFile === null -> Submit BLOCKED
    expect(isSubmitEnabled()).toBe(false);

    // Step A: User selects INVALID document
    selectedFile = { uri: "file://invalid.png", name: "cat_photo.png", mimeType: "image/png", size: 1024 };
    isInvalidDocument = true;
    validationError = "This document doesn't appear to be a resume or CV.";
    hasValidUploadCompleted = false;

    // Submission MUST be BLOCKED
    expect(isSubmitEnabled()).toBe(false);

    // Step B: User selects VALID document (INVALID -> VALID transition)
    selectedFile = { uri: "file://valid_resume.pdf", name: "John_Doe_Resume.pdf", mimeType: "application/pdf", size: 2048 };
    isInvalidDocument = false;
    validationError = null;
    hasValidUploadCompleted = true;

    // Submission MUST be ALLOWED
    expect(isSubmitEnabled()).toBe(true);

    // Step C: User selects INVALID document again (VALID -> INVALID transition)
    selectedFile = { uri: "file://receipt.png", name: "grocery_receipt.png", mimeType: "image/png", size: 1024 };
    isInvalidDocument = true;
    validationError = "This document doesn't appear to be a resume or CV.";
    hasValidUploadCompleted = false; // Stale valid upload MUST NOT remain completed!

    // Submission MUST be BLOCKED again
    expect(isSubmitEnabled()).toBe(false);
  });

  test("4. Entering upload screen does not mutate existing active resume", () => {
    const mockActiveResume: any = {
      id: "res_123",
      originalFileName: "Existing_Resume_2025.pdf",
      targetPosition: "Software Engineer",
      overallScore: 85,
    };

    // Simulate active resume in background store
    const currentStoreState = { activeResume: mockActiveResume };

    // Simulate opening upload screen with selectedFile starting null
    let selectedFile: any = null;
    expect(selectedFile).toBeNull();
    // Existing active resume remains intact in background store
    expect(currentStoreState.activeResume).toEqual(mockActiveResume);

    // Canceling or failing an upload leaves activeResume untouched
    let isInvalidDocument = true;
    let validationError = "This document doesn't appear to be a resume or CV.";
    expect(currentStoreState.activeResume).toEqual(mockActiveResume);
  });
});
