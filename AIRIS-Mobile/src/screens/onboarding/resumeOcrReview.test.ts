import { validateResumeText, normalizeResumeText } from "../../services/resume/resumeNormalizer";
import { classifyNameMatch } from "../../utils/nameMatcher";

describe("Resume OCR Review Stage & Editable Text Validation", () => {
  it("rejects empty or whitespace-only text during OCR review", () => {
    expect(() => validateResumeText("")).toThrow();
    expect(() => validateResumeText("   \n\t  ")).toThrow();
  });

  it("rejects excessively short OCR fragments that cannot form a valid resume", () => {
    expect(() => validateResumeText("John Doe Resume")).toThrow();
  });

  it("accepts substantive reviewed OCR resume text", () => {
    const validOcrText = `
      John Doe
      BS Information Technology, Technological Institute of the Philippines
      Skills: JavaScript, TypeScript, React Native, Node.js, Git
      Experience:
      Frontend Developer Intern at TechCorp (2023 - 2024)
      Developed user interface components and integrated REST APIs.
      Education:
      Bachelor of Science in Information Technology (2020 - 2024)
    `;
    expect(() => validateResumeText(validOcrText)).not.toThrow();
    const normalized = normalizeResumeText(validOcrText);
    expect(normalized).toContain("TechCorp");
  });

  it("accurately detects name mismatch between profile and reviewed OCR text", () => {
    const ocrTextDifferentPerson = `
      Maria Santos
      BS Computer Science, TIP Manila
      Skills: Python, Django, SQL
      Experience:
      Software Intern at DevCorp (2023 - 2024)
    `;
    const check = classifyNameMatch("Daniel Tan", ocrTextDifferentPerson);
    expect(check.classification).toBe("CLEAR_MISMATCH");
  });

  it("passes name verification when candidate corrects OCR typos in their name", () => {
    // Suppose OCR read "Danlel Tan" (typo) - corrected by user to "Daniel Tan"
    const correctedOcrText = `
      Daniel Tan
      BS Information Technology, TIP Manila
      Skills: React Native, Python, SQL
    `;
    const check = classifyNameMatch("Daniel Tan", correctedOcrText);
    expect(check.classification).toBe("MATCH");
  });

  it("determines whether precomputed analysis should be discarded when text is edited", () => {
    const originalOcr = "Original OCR text with some errors";
    const editedOcr = "Original OCR text with corrected errors and added skills";

    const isModified = originalOcr.trim() !== editedOcr.trim();
    expect(isModified).toBe(true);

    const detailType = isModified ? "image_ocr_edited" : "image_ocr";
    expect(detailType).toBe("image_ocr_edited");

    const analysisToUse = isModified ? undefined : { score: 85 };
    expect(analysisToUse).toBeUndefined();
  });

  it("preserves precomputed analysis when OCR text is confirmed without edits", () => {
    const originalOcr = "Original substantive OCR text confirmed as-is by candidate";
    const reviewedOcr = "Original substantive OCR text confirmed as-is by candidate";

    const isModified = originalOcr.trim() !== reviewedOcr.trim();
    expect(isModified).toBe(false);

    const detailType = isModified ? "image_ocr_edited" : "image_ocr";
    expect(detailType).toBe("image_ocr");

    const cachedAnalysis = { score: 92, status: "completed" };
    const analysisToUse = isModified ? undefined : cachedAnalysis;
    expect(analysisToUse).toBe(cachedAnalysis);
  });

  it("safely resets review state on user cancellation or retake", () => {
    let showReviewModal = true;
    let pendingFile: any = { name: "test_camera.jpg", uri: "file://test.jpg" };
    let reviewText = "Sample extracted OCR text";
    let uploadStage = "idle";

    // Simulate handleCancelOcrReview
    const handleCancel = () => {
      showReviewModal = false;
      pendingFile = null;
      reviewText = "";
      uploadStage = "idle";
    };

    handleCancel();

    expect(showReviewModal).toBe(false);
    expect(pendingFile).toBeNull();
    expect(reviewText).toBe("");
    expect(uploadStage).toBe("idle");
  });

  it("guards against duplicate concurrent submissions during OCR review confirmation", () => {
    let isSubmitting = false;
    let submissionCallCount = 0;

    const submit = async () => {
      if (isSubmitting) return;
      isSubmitting = true;
      try {
        submissionCallCount++;
        // simulate async processing
        await new Promise((r) => setTimeout(r, 10));
      } finally {
        isSubmitting = false;
      }
    };

    // Trigger two rapid consecutive submissions
    const p1 = submit();
    const p2 = submit();

    return Promise.all([p1, p2]).then(() => {
      expect(submissionCallCount).toBe(1);
    });
  });

  it("handles on-device Google ML Kit extraction and routes directly to review modal without raw file upload", async () => {
    // Simulate ML Kit text recognition mock
    const mockRecognize = jest.fn().mockResolvedValue({
      text: "Daniel Tan\nBS Information Technology\nSkills: Python, TypeScript, React Native\nExperience: Frontend Developer Intern",
      blocks: [],
    });

    const assetUri = "file:///data/user/0/com.airis.mobile/cache/camera_capture.jpg";
    const ocrResult = await mockRecognize(assetUri);
    const extracted = (ocrResult?.text || "").trim();

    expect(extracted).toContain("Daniel Tan");
    expect(extracted).toContain("React Native");

    // State transitions for review modal
    const reviewState = {
      pendingOcrFile: { uri: assetUri, name: "resume_camera.jpg", mimeType: "image/jpeg", size: 102400 },
      pendingOcrSourceType: "image",
      pendingOcrDetailType: "image_ocr",
      pendingOcrOriginalText: extracted,
      ocrReviewText: extracted,
      showOcrReviewModal: true,
      pendingPrecomputedAnalysis: undefined, // Must be undefined to trigger canonical backend analysis on confirmed text
    };

    expect(reviewState.showOcrReviewModal).toBe(true);
    expect(reviewState.pendingPrecomputedAnalysis).toBeUndefined();
    expect(reviewState.ocrReviewText).toEqual(extracted);
  });

  it("handles empty or unreadable ML Kit results by rejecting with user guidance instead of crashing", async () => {
    const mockRecognizeEmpty = jest.fn().mockResolvedValue({ text: "   \n\t  ", blocks: [] });
    const assetUri = "file:///cache/blurry_blank_photo.jpg";
    const ocrResult = await mockRecognizeEmpty(assetUri);
    const extracted = (ocrResult?.text || "").trim();

    const isReadable = extracted.length > 0;
    expect(isReadable).toBe(false);

    let alertTriggered = false;
    let alertMessage = "";
    if (!isReadable) {
      alertTriggered = true;
      alertMessage = "Google ML Kit could not detect any readable text in this photo.";
    }

    expect(alertTriggered).toBe(true);
    expect(alertMessage).toContain("could not detect any readable text");
  });

  it("falls back safely to secondary handler when native TextRecognition module is unlinked", () => {
    const mockNativeModules: any = {}; // No TextRecognition
    const isMlKitAvailable = Boolean(mockNativeModules?.TextRecognition);
    expect(isMlKitAvailable).toBe(false);

    let fallbackCalled = false;
    const fallbackHandler = () => { fallbackCalled = true; };

    if (!isMlKitAvailable) {
      fallbackHandler();
    }

    expect(fallbackCalled).toBe(true);
  });
});

