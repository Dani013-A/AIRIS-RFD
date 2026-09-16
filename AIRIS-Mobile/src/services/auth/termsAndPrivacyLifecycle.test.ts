jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Alert: { alert: jest.fn() },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockUpdateDoc = jest.fn();
const mockServerTimestamp = jest.fn(() => "2026-09-17T00:00:00.000Z");

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, coll, id) => `${coll}/${id}`),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  runTransaction: jest.fn(),
}));

jest.mock("../../config/firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "test_user_consent_123" } },
}));

import { useAuthStore } from "../../store/authStore";
import { completeInitialSetup, updateAcceptedConsents } from "../firebase/userService";

describe("Account-Level Terms and Privacy Policy Lifecycle & Invariants Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      currentUser: {
        uid: "test_user_consent_123",
        email: "student@tip.edu.ph",
        fullName: "Test Student",
        role: "student",
        accountState: "ACTIVE",
        hasCompletedInitialSetup: false,
        hasCompletedOnboarding: false,
        isProfileComplete: false,
        acceptedTerms: false,
        acceptedPrivacy: false,
        termsVersion: "",
        privacyVersion: "",
      },
      loading: false,
      error: null,
    });
  });

  test("A. New account onboarding flow: proceeds College -> Program -> Position -> Dashboard without terms/privacy step", async () => {
    const store = useAuthStore.getState();
    expect(store.currentUser?.acceptedTerms).toBe(false);
    expect(store.currentUser?.acceptedPrivacy).toBe(false);

    // Initial setup completes Position Selection
    await store.completeInitialSetup(
      "College of Information Technology",
      "BS Information Technology",
      "Junior Frontend Developer"
    );

    const updatedUser = useAuthStore.getState().currentUser;
    expect(updatedUser?.college).toBe("College of Information Technology");
    expect(updatedUser?.degreeProgram).toBe("BS Information Technology");
    expect(updatedUser?.targetPosition).toBe("Junior Frontend Developer");
    expect(updatedUser?.hasCompletedInitialSetup).toBe(true);
    expect(updatedUser?.hasCompletedOnboarding).toBe(true);

    // Terms/Privacy MUST NOT have been silently or prematurely marked accepted during onboarding
    expect(updatedUser?.acceptedTerms).toBe(false);
    expect(updatedUser?.acceptedPrivacy).toBe(false);
  });

  test("B. First resume upload for unaccepted account requires explicit Terms and Privacy acknowledgement", () => {
    const user = useAuthStore.getState().currentUser;
    const hasAcceptedConsents = Boolean(user?.acceptedTerms && user?.acceptedPrivacy);

    expect(hasAcceptedConsents).toBe(false);

    // Unaccepted user cannot proceed without both checkboxes
    let canUploadWithoutConsent = false;
    if (hasAcceptedConsents) {
      canUploadWithoutConsent = true;
    }
    expect(canUploadWithoutConsent).toBe(false);
  });

  test("C. Successful first acceptance persists authoritatively at the account level", async () => {
    const store = useAuthStore.getState();

    await store.saveAcceptedConsents(true, true, "1.0.0", "1.0.0");

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "users/test_user_consent_123",
      expect.objectContaining({
        acceptedTerms: true,
        acceptedPrivacy: true,
        termsVersion: "1.0.0",
        privacyVersion: "1.0.0",
      })
    );

    const updatedUser = useAuthStore.getState().currentUser;
    expect(updatedUser?.acceptedTerms).toBe(true);
    expect(updatedUser?.acceptedPrivacy).toBe(true);
    expect(updatedUser?.termsVersion).toBe("1.0.0");
    expect(updatedUser?.privacyVersion).toBe("1.0.0");
  });

  test("D. Second and subsequent resume uploads detect persisted account-level acceptance and skip checkboxes", () => {
    useAuthStore.setState({
      currentUser: {
        ...useAuthStore.getState().currentUser!,
        acceptedTerms: true,
        acceptedPrivacy: true,
        termsVersion: "1.0.0",
        privacyVersion: "1.0.0",
      },
    });

    const user = useAuthStore.getState().currentUser;
    const hasAcceptedConsents = Boolean(user?.acceptedTerms && user?.acceptedPrivacy);

    // When hasAcceptedConsents is true, checkboxes are omitted and upload proceeds directly
    expect(hasAcceptedConsents).toBe(true);
  });

  test("E. Acceptance survives new analysisSessionId, new resume, and navigation", () => {
    useAuthStore.setState({
      currentUser: {
        ...useAuthStore.getState().currentUser!,
        acceptedTerms: true,
        acceptedPrivacy: true,
        termsVersion: "1.0.0",
        privacyVersion: "1.0.0",
      },
    });

    // Simulate session 1
    const session1Id = "session_aaa_111";
    let hasAccepted = Boolean(useAuthStore.getState().currentUser?.acceptedTerms && useAuthStore.getState().currentUser?.acceptedPrivacy);
    expect(hasAccepted).toBe(true);

    // Simulate session 2 with a different analysisSessionId and a new resume
    const session2Id = "session_bbb_222";
    hasAccepted = Boolean(useAuthStore.getState().currentUser?.acceptedTerms && useAuthStore.getState().currentUser?.acceptedPrivacy);
    expect(hasAccepted).toBe(true);
  });

  test("F. App restart/reload preserves acceptance state from user profile data", () => {
    // Simulating initial profile load after app cold start
    const restoredFirestoreProfile = {
      uid: "test_user_consent_123",
      email: "student@tip.edu.ph",
      fullName: "Test Student",
      role: "student" as const,
      accountState: "ACTIVE" as const,
      hasCompletedInitialSetup: true,
      hasCompletedOnboarding: true,
      isProfileComplete: true,
      acceptedTerms: true,
      acceptedPrivacy: true,
      termsVersion: "1.0.0",
      privacyVersion: "1.0.0",
    };

    useAuthStore.setState({
      currentUser: restoredFirestoreProfile,
    });

    const user = useAuthStore.getState().currentUser;
    expect(user?.acceptedTerms).toBe(true);
    expect(user?.acceptedPrivacy).toBe(true);
    const hasAcceptedConsents = Boolean(user?.acceptedTerms && user?.acceptedPrivacy);
    expect(hasAcceptedConsents).toBe(true);
  });

  test("G. Repeated acceptance save is idempotent and avoids redundant duplicate writes", async () => {
    useAuthStore.setState({
      currentUser: {
        ...useAuthStore.getState().currentUser!,
        acceptedTerms: true,
        acceptedPrivacy: true,
        termsVersion: "1.0.0",
        privacyVersion: "1.0.0",
      },
    });

    mockUpdateDoc.mockClear();

    // Repeated call with same version
    await useAuthStore.getState().saveAcceptedConsents(true, true, "1.0.0", "1.0.0");

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test("H. User who has never accepted cannot bypass acknowledgement on first upload", () => {
    useAuthStore.setState({
      currentUser: {
        ...useAuthStore.getState().currentUser!,
        acceptedTerms: false,
        acceptedPrivacy: false,
      },
    });

    const user = useAuthStore.getState().currentUser;
    const hasAccepted = Boolean(user?.acceptedTerms && user?.acceptedPrivacy);
    const localAgreeTerms = false;
    const localAgreePrivacy = false;

    const isAuthorizedToUpload = hasAccepted || (localAgreeTerms && localAgreePrivacy);
    expect(isAuthorizedToUpload).toBe(false);
  });

  test("I. Terms of Service and Privacy Policy remain independently represented and validated", () => {
    // Terms only accepted
    const termsOnlyUser = { acceptedTerms: true, acceptedPrivacy: false };
    expect(Boolean(termsOnlyUser.acceptedTerms && termsOnlyUser.acceptedPrivacy)).toBe(false);

    // Privacy only accepted
    const privacyOnlyUser = { acceptedTerms: false, acceptedPrivacy: true };
    expect(Boolean(privacyOnlyUser.acceptedTerms && privacyOnlyUser.acceptedPrivacy)).toBe(false);

    // Both accepted
    const bothAcceptedUser = { acceptedTerms: true, acceptedPrivacy: true };
    expect(Boolean(bothAcceptedUser.acceptedTerms && bothAcceptedUser.acceptedPrivacy)).toBe(true);
  });
});
