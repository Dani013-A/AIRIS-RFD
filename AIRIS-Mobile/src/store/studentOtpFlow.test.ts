import { useAuthStore } from "./authStore";
import * as otpService from "../services/api/otpService";
import * as authService from "../services/firebase/authService";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { onAuthStateChanged, signOut, signInWithCredential } from "firebase/auth";

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
}));

const mockAuthUser = {
  uid: "mock_student_123",
  email: "mstudent@tip.edu.ph",
  displayName: "Juan Dela Cruz",
  emailVerified: true,
  getIdToken: jest.fn().mockResolvedValue("mock_firebase_id_token"),
  reload: jest.fn().mockResolvedValue(undefined),
  providerData: [{ providerId: "google.com" }],
};

jest.mock("../config/firebase", () => ({
  auth: {
    get currentUser() {
      return mockAuthUser;
    },
  },
  db: {},
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: { credential: jest.fn((idToken: string) => ({ idToken, providerId: "google.com" })) },
  EmailAuthProvider: { credential: jest.fn() },
  signInWithCredential: jest.fn(),
  getAdditionalUserInfo: jest.fn(),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  reauthenticateWithCredential: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, _col, id) => ({ id, path: `${_col}/${id}` })),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock("../services/firebase/userService", () => ({
  createProfileTransaction: jest.fn().mockImplementation(async (uid, profile) => profile),
  fetchUserProfile: jest.fn().mockResolvedValue({ role: "student" }),
  deleteUserAccountCascade: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../services/firebase/authService", () => ({
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  registerStudent: jest.fn(),
  resendVerificationEmail: jest.fn(),
  getUserById: jest.fn(),
  resetUserPassword: jest.fn(),
  changePassword: jest.fn(),
  EmailNotVerifiedError: class EmailNotVerifiedError extends Error {},
}));

jest.mock("../services/api/otpService");

describe("Student Email OTP Verification Unit & Regression Tests", () => {
  const mockStudentUser = {
    uid: "mock_student_123",
    email: "mstudent@tip.edu.ph",
    fullName: "Juan Dela Cruz",
    role: "student" as const,
    isProfileComplete: true,
    accountState: "ACTIVE" as const,
    isDeleted: false,
    isDisabled: false,
    hasCompletedOnboarding: true,
    hasCompletedInitialSetup: true,
    college: "CCS",
    degreeProgram: "BSCS",
    targetPosition: "Software Engineer",
    acceptedTerms: true,
    acceptedPrivacy: true,
    termsVersion: "1.0",
    privacyVersion: "1.0",
    activeResumeId: null,
  };

  const mockStudentUser2 = {
    uid: "mock_student_456",
    email: "mstudent2@tip.edu.ph",
    fullName: "Maria Clara",
    role: "student" as const,
    isProfileComplete: true,
    accountState: "ACTIVE" as const,
    isDeleted: false,
    isDisabled: false,
    hasCompletedOnboarding: true,
    hasCompletedInitialSetup: true,
    college: "CCS",
    degreeProgram: "BSIT",
    targetPosition: "QA Engineer",
    acceptedTerms: true,
    acceptedPrivacy: true,
    termsVersion: "1.0",
    privacyVersion: "1.0",
    activeResumeId: null,
  };

  let authStateCallback: ((user: any) => Promise<void>) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "mock_client_id_tip";

    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => {
      authStateCallback = cb;
      return jest.fn();
    });

    useAuthStore.setState({
      currentUser: null,
      loading: false,
      isInitialized: true,
      error: null,
      isOtpRequired: false,
      isOtpVerified: false,
      otpMaskedEmail: null,
      otpCooldownRemaining: 0,
      otpError: null,
      isOtpVerifying: false,
      pendingOtpUser: null,
      authTransactionState: "IDLE",
      isGoogleLoading: false,
      isRegistering: false,
    });
  });

  // Test 1: Fresh email/password login initiates OTP challenge
  it("1. Fresh login without existing OTP session initiates server challenge and guards protected state", async () => {
    (authService.loginUser as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce(null);
    (otpService.sendStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: true,
      maskedEmail: "s****mt@tip.edu.ph",
      cooldownSeconds: 60,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await useAuthStore.getState().login("mstudent@tip.edu.ph", "ValidPass123!");

    const state = useAuthStore.getState();
    expect(state.currentUser).toBeNull();
    expect(state.pendingOtpUser?.uid).toBe("mock_student_123");
    expect(state.isOtpRequired).toBe(true);
    expect(state.isOtpVerified).toBe(false);
    expect(state.otpMaskedEmail).toBe("s****mt@tip.edu.ph");
    expect(state.authTransactionState).toBe("OTP_CHALLENGE");
    expect(otpService.sendStudentOtp).toHaveBeenCalledWith("mock_firebase_id_token");
  });

  // Test 2: Existing valid OTP session restores access without re-prompting OTP
  it("2. Existing valid OTP session restores access without re-prompting OTP", async () => {
    (authService.loginUser as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce({
      sessionToken: "valid_signed_token",
      expiresAt: Date.now() + 7 * 3600 * 1000,
    });

    await useAuthStore.getState().login("mstudent@tip.edu.ph", "ValidPass123!");

    const state = useAuthStore.getState();
    expect(state.currentUser?.uid).toBe("mock_student_123");
    expect(state.isOtpRequired).toBe(false);
    expect(state.isOtpVerified).toBe(true);
    expect(state.authTransactionState).toBe("COMPLETED");
    expect(otpService.sendStudentOtp).not.toHaveBeenCalled();
  });

  // Test 3: Email/password login and restoration
  it("3. Email/password login followed by OTP verification persists session and restores on app restart", async () => {
    // Stage 1: Login and challenge
    (authService.loginUser as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce(null);
    (otpService.sendStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: true,
      maskedEmail: "s****mt@tip.edu.ph",
      cooldownSeconds: 60,
    });

    await useAuthStore.getState().login("mstudent@tip.edu.ph", "ValidPass123!");
    expect(useAuthStore.getState().authTransactionState).toBe("OTP_CHALLENGE");

    // Stage 2: Verification
    (otpService.verifyStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: true,
      sessionToken: "email_pw_signed_token",
      user: { uid: "mock_student_123", email: "mstudent@tip.edu.ph", role: "student" },
    });
    (otpService.storeStudentOtpSession as jest.Mock).mockResolvedValueOnce(undefined);

    const verified = await useAuthStore.getState().verifyStudentOtpAction("654321");
    expect(verified).toBe(true);
    expect(otpService.storeStudentOtpSession).toHaveBeenCalledWith(
      "mock_student_123",
      "email_pw_signed_token",
      expect.any(Number)
    );
    expect(useAuthStore.getState().isOtpVerified).toBe(true);
    expect(useAuthStore.getState().currentUser?.uid).toBe("mock_student_123");

    // Stage 3: App cold start / restart
    useAuthStore.setState({ currentUser: null, isOtpVerified: false, authTransactionState: "IDLE" });
    useAuthStore.getState().initializeAuth();

    (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce({
      sessionToken: "email_pw_signed_token",
      expiresAt: Date.now() + 6 * 3600 * 1000,
    });

    await authStateCallback!(mockAuthUser);

    const restoredState = useAuthStore.getState();
    expect(restoredState.currentUser?.uid).toBe("mock_student_123");
    expect(restoredState.isOtpVerified).toBe(true);
    expect(signOut).not.toHaveBeenCalled();
  });

  // Test 4: Google login without existing OTP session triggers challenge
  it("4. Google login without existing OTP session triggers OTP challenge and gates access", async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: "success",
      data: { idToken: "google_id_token_123" },
    });
    (signInWithCredential as jest.Mock).mockResolvedValueOnce({
      user: mockAuthUser,
    });
    (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce(null);
    (otpService.sendStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: true,
      maskedEmail: "s****mt@tip.edu.ph",
      cooldownSeconds: 60,
    });

    await useAuthStore.getState().loginWithGoogle();

    const state = useAuthStore.getState();
    // Route guard: currentUser must NOT be populated before OTP
    expect(state.currentUser).toBeNull();
    expect(state.pendingOtpUser?.uid).toBe("mock_student_123");
    expect(state.isOtpRequired).toBe(true);
    expect(state.isOtpVerified).toBe(false);
    expect(state.authTransactionState).toBe("OTP_CHALLENGE");
    expect(otpService.sendStudentOtp).toHaveBeenCalledWith("mock_firebase_id_token");
  });

  // Test 5: Google login followed by successful OTP verification and app restart
  it("5. Google login followed by successful OTP verification and app restart restores session", async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: "success",
      data: { idToken: "google_id_token_123" },
    });
    (signInWithCredential as jest.Mock).mockResolvedValueOnce({
      user: mockAuthUser,
    });
    (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce(null);
    (otpService.sendStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: true,
      maskedEmail: "s****mt@tip.edu.ph",
      cooldownSeconds: 60,
    });

    await useAuthStore.getState().loginWithGoogle();

    // Verify OTP
    (otpService.verifyStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: true,
      sessionToken: "google_student_session_token",
      user: { uid: "mock_student_123", email: "mstudent@tip.edu.ph", role: "student" },
    });
    (otpService.storeStudentOtpSession as jest.Mock).mockResolvedValueOnce(undefined);

    const verified = await useAuthStore.getState().verifyStudentOtpAction("123456");
    expect(verified).toBe(true);
    expect(otpService.storeStudentOtpSession).toHaveBeenCalledWith(
      "mock_student_123",
      "google_student_session_token",
      expect.any(Number)
    );
    expect(useAuthStore.getState().currentUser?.uid).toBe("mock_student_123");
    expect(useAuthStore.getState().isOtpVerified).toBe(true);

    // Simulate app restart / cold start
    useAuthStore.setState({ currentUser: null, isOtpVerified: false, authTransactionState: "IDLE" });
    useAuthStore.getState().initializeAuth();

    (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce({
      sessionToken: "google_student_session_token",
      expiresAt: Date.now() + 7 * 3600 * 1000,
    });

    await authStateCallback!(mockAuthUser);

    const restoredState = useAuthStore.getState();
    expect(restoredState.currentUser?.uid).toBe("mock_student_123");
    expect(restoredState.isOtpVerified).toBe(true);
    expect(signOut).not.toHaveBeenCalled();
  });

  // Test 6: Google login without OTP verification signs out on restart
  it("6. Google login without OTP verification signed out on app restart", async () => {
    // Simulate student did Google login, reached OTP challenge, but closed/killed app without verifying
    useAuthStore.setState({ currentUser: null, isOtpVerified: false, authTransactionState: "IDLE" });
    useAuthStore.getState().initializeAuth();

    (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    // No stored OTP session exists on device
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce(null);

    await authStateCallback!(mockAuthUser);

    const state = useAuthStore.getState();
    expect(signOut).toHaveBeenCalled();
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(state.currentUser).toBeNull();
    expect(state.isOtpVerified).toBe(false);
  });

  // Test 7: Expired or missing OTP session on app cold start
  it("7. Expired or missing OTP session triggers automatic sign out on app cold start", async () => {
    useAuthStore.setState({ currentUser: null, isOtpVerified: false, authTransactionState: "IDLE" });
    useAuthStore.getState().initializeAuth();

    (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockStudentUser);
    // getStoredStudentOtpSession returns null when expired
    (otpService.getStoredStudentOtpSession as jest.Mock).mockResolvedValueOnce(null);

    await authStateCallback!(mockAuthUser);

    expect(signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().isOtpVerified).toBe(false);
  });

  // Test 8: Account switching between two student UIDs
  it("8. Account switching between two student UIDs restores the respective bound session", async () => {
    // Student A signs in and gets session A
    useAuthStore.setState({ pendingOtpUser: mockStudentUser, isOtpRequired: true, authTransactionState: "OTP_CHALLENGE" });
    (otpService.verifyStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: true,
      sessionToken: "token_for_student_a",
    });
    (otpService.storeStudentOtpSession as jest.Mock).mockResolvedValueOnce(undefined);
    await useAuthStore.getState().verifyStudentOtpAction("111111");

    expect(otpService.storeStudentOtpSession).toHaveBeenCalledWith(
      "mock_student_123",
      "token_for_student_a",
      expect.any(Number)
    );

    // Student B logs in on same device
    const mockAuthUserB = {
      ...mockAuthUser,
      uid: "mock_student_456",
      email: "mstudent2@tip.edu.ph",
    };
    useAuthStore.setState({ pendingOtpUser: mockStudentUser2, isOtpRequired: true, authTransactionState: "OTP_CHALLENGE" });
    (otpService.verifyStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: true,
      sessionToken: "token_for_student_b",
    });
    (otpService.storeStudentOtpSession as jest.Mock).mockResolvedValueOnce(undefined);
    await useAuthStore.getState().verifyStudentOtpAction("222222");

    expect(otpService.storeStudentOtpSession).toHaveBeenCalledWith(
      "mock_student_456",
      "token_for_student_b",
      expect.any(Number)
    );

    // Cold start with Student B: verifies Student B's UID lookup
    useAuthStore.setState({ currentUser: null, isOtpVerified: false, authTransactionState: "IDLE" });
    useAuthStore.getState().initializeAuth();

    (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockStudentUser2);
    (otpService.getStoredStudentOtpSession as jest.Mock).mockImplementation(async (uid: string) => {
      if (uid === "mock_student_456") {
        return { sessionToken: "token_for_student_b", expiresAt: Date.now() + 7 * 3600 * 1000 };
      }
      return null;
    });

    await authStateCallback!(mockAuthUserB);

    expect(otpService.getStoredStudentOtpSession).toHaveBeenCalledWith("mock_student_456");
    expect(useAuthStore.getState().currentUser?.uid).toBe("mock_student_456");
    expect(useAuthStore.getState().isOtpVerified).toBe(true);
  });

  // Test 9: Logout invalidates stored OTP session and subsequent restart stays logged out
  it("9. Logout invalidates stored OTP session on device and subsequent restart stays logged out", async () => {
    useAuthStore.setState({
      currentUser: mockStudentUser,
      isOtpVerified: true,
    });
    (authService.logoutUser as jest.Mock).mockResolvedValueOnce(undefined);
    (otpService.clearStudentOtpSession as jest.Mock).mockResolvedValueOnce(undefined);

    await useAuthStore.getState().logout();

    expect(otpService.clearStudentOtpSession).toHaveBeenCalled();
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().isOtpVerified).toBe(false);

    // Subsequent app restart when Firebase user is null
    useAuthStore.getState().initializeAuth();
    await authStateCallback!(null);

    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  // Test 10: Failed OTP verification
  it("10. Failed OTP verification rejects code and leaves student unauthenticated", async () => {
    useAuthStore.setState({
      pendingOtpUser: mockStudentUser,
      isOtpRequired: true,
      authTransactionState: "OTP_CHALLENGE",
    });

    (otpService.verifyStudentOtp as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: "Incorrect verification code. 4 attempts remaining.",
      remainingAttempts: 4,
    });

    const verified = await useAuthStore.getState().verifyStudentOtpAction("999999");

    expect(verified).toBe(false);
    const state = useAuthStore.getState();
    expect(state.currentUser).toBeNull();
    expect(state.isOtpRequired).toBe(true);
    expect(state.otpError).toBe("Incorrect verification code. 4 attempts remaining.");
    expect(state.authTransactionState).toBe("OTP_CHALLENGE");
    expect(otpService.storeStudentOtpSession).not.toHaveBeenCalled();
  });

  // Test 11: Cancelled OTP challenge
  it("11. Cancelled OTP challenge cleanly signs out both Firebase and Google and resets state", async () => {
    useAuthStore.setState({
      pendingOtpUser: mockStudentUser,
      isOtpRequired: true,
      authTransactionState: "OTP_CHALLENGE",
    });

    await useAuthStore.getState().cancelStudentOtpAction();

    const state = useAuthStore.getState();
    expect(signOut).toHaveBeenCalled();
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(state.currentUser).toBeNull();
    expect(state.pendingOtpUser).toBeNull();
    expect(state.isOtpRequired).toBe(false);
    expect(state.authTransactionState).toBe("IDLE");
  });
});
