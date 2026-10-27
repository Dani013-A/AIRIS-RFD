jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock("../services/api/otpService", () => ({
  getStoredStudentOtpSession: jest.fn().mockResolvedValue({ sessionToken: "mock_tok", expiresAt: Date.now() + 100000 }),
  sendStudentOtp: jest.fn().mockResolvedValue({ success: true, maskedEmail: "a****me@tip.edu.ph" }),
  verifyStudentOtp: jest.fn().mockResolvedValue({ success: true, sessionToken: "mock_tok" }),
  storeStudentOtpSession: jest.fn().mockResolvedValue(undefined),
  clearStudentOtpSession: jest.fn().mockResolvedValue(undefined),
}));

import { useAuthStore, stopUserRealtimeListener } from "./authStore";
import {
  determineAccountLifecycleState,
  ACCOUNT_PAUSED_MSG,
  ACCOUNT_REMOVED_MSG,
  ACCOUNT_MISSING_PROFILE_MSG,
} from "../utils/accountLifecycle";
import { mapAuthError, MSG_INVALID_CREDENTIAL, MSG_EMAIL_ALREADY_IN_USE } from "../utils/errorMapper";
import { registerStudent, loginUser } from "../services/firebase/authService";
import { createProfileTransaction } from "../services/firebase/userService";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  deleteUser,
  getAdditionalUserInfo,
  onAuthStateChanged,
} from "firebase/auth";
import { getDoc, setDoc } from "firebase/firestore";

jest.mock("firebase/auth", () => ({
  signInWithCredential: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  updatePassword: jest.fn().mockResolvedValue(undefined),
  reauthenticateWithCredential: jest.fn().mockResolvedValue(undefined),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: { credential: jest.fn((token: string) => ({ token })) },
  EmailAuthProvider: { credential: jest.fn() },
  getAdditionalUserInfo: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
    hasPlayServices: jest.fn().mockResolvedValue(true),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db: any, _col: string, id: string) => ({ id, path: `${_col}/${id}` })),
  getDoc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => "2026-09-14T00:00:00Z"),
  runTransaction: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock("../services/firebase/userService", () => ({
  createProfileTransaction: jest.fn(),
  updateProfileDetails: jest.fn(),
  deleteUserAccountCascade: jest.fn(),
  completeUserOnboardingWithConsents: jest.fn(),
}));

jest.mock("../config/firebase", () => ({
  auth: {
    currentUser: {
      uid: "test_uid",
      email: "mstudent@tip.edu.ph",
      emailVerified: true,
      reload: jest.fn().mockResolvedValue(undefined),
      getIdToken: jest.fn().mockResolvedValue("tok"),
    },
  },
  db: {},
}));

const mockCreateProfileTransaction = createProfileTransaction as jest.MockedFunction<typeof createProfileTransaction>;

describe("Registration State Machine Comprehensive Verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopUserRealtimeListener();
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "mock_client_id.apps.googleusercontent.com";
    (require("../services/api/otpService").getStoredStudentOtpSession as jest.Mock).mockResolvedValue({
      sessionToken: "mock_tok",
      expiresAt: Date.now() + 100000,
    });
    useAuthStore.setState({
      currentUser: null,
      loading: false,
      isGoogleLoading: false,
      isInitialized: false,
      isRegistering: false,
      authTransactionState: "IDLE",
      error: null,
      registrationSuccess: false,
      emailNotVerified: false,
    });
  });

  afterEach(() => {
    stopUserRealtimeListener();
  });

  afterAll(() => {
    stopUserRealtimeListener();
  });

  // 1. Fresh email registration
  it("1. Fresh email registration creates Auth user, sets document, and completes", async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: "fresh_email_uid", email: "mfresh@tip.edu.ph", getIdToken: jest.fn().mockResolvedValue("tok") },
    });

    await useAuthStore.getState().register("mfresh@tip.edu.ph", "Pass1234!", "Fresh Student");

    expect(createProfileTransaction).toHaveBeenCalledWith(
      "fresh_email_uid",
      expect.objectContaining({
        uid: "fresh_email_uid",
        email: "mfresh@tip.edu.ph",
        accountState: "ACTIVE",
      })
    );
    expect(useAuthStore.getState().registrationSuccess).toBe(true);
    expect(useAuthStore.getState().authTransactionState).toBe("COMPLETED");
  });

  // 2. Fresh Google registration
  it("2. Fresh Google registration creates profile without pre-existing doc", async () => {
    const GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    GoogleSignin.signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "valid_id_token" } });

    const mockFirebaseUser = {
      uid: "fresh_google_uid",
      email: "mfreshgoogle@tip.edu.ph",
      emailVerified: true,
      displayName: "Fresh Google Student",
      getIdToken: jest.fn().mockResolvedValue("tok"),
    };
    (signInWithCredential as jest.Mock).mockResolvedValueOnce({ user: mockFirebaseUser });
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });
    mockCreateProfileTransaction.mockResolvedValueOnce({
      uid: "fresh_google_uid",
      email: "mfreshgoogle@tip.edu.ph",
      fullName: "Fresh Google Student",
      role: "student",
      accountState: "ACTIVE",
      isDeleted: false,
      isDisabled: false,
      isProfileComplete: false,
      hasCompletedOnboarding: false,
    });

    await useAuthStore.getState().loginWithGoogle(true);

    expect(mockCreateProfileTransaction).toHaveBeenCalledWith(
      "fresh_google_uid",
      expect.objectContaining({
        uid: "fresh_google_uid",
        accountState: "ACTIVE",
      })
    );
    expect(useAuthStore.getState().currentUser?.uid).toBe("fresh_google_uid");
    expect(useAuthStore.getState().authTransactionState).toBe("COMPLETED");
  });

  // 3. Google registration with existing Auth user but missing profile (interrupted setup recovery)
  it("3. Google registration with existing Auth user but missing profile safely recovers", async () => {
    const GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    GoogleSignin.signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "valid_id_token" } });

    const mockFirebaseUser = {
      uid: "interrupted_uid",
      email: "minterrupted@tip.edu.ph",
      emailVerified: true,
      displayName: "Interrupted Student",
      getIdToken: jest.fn().mockResolvedValue("tok"),
    };
    (signInWithCredential as jest.Mock).mockResolvedValueOnce({ user: mockFirebaseUser });
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });
    mockCreateProfileTransaction.mockResolvedValueOnce({
      uid: "interrupted_uid",
      email: "minterrupted@tip.edu.ph",
      fullName: "Interrupted Student",
      role: "student",
      accountState: "ACTIVE",
      isDeleted: false,
      isDisabled: false,
      isProfileComplete: false,
      hasCompletedOnboarding: false,
    });

    await useAuthStore.getState().loginWithGoogle(true);

    expect(mockCreateProfileTransaction).toHaveBeenCalledWith(
      "interrupted_uid",
      expect.objectContaining({ accountState: "ACTIVE" })
    );
    expect(useAuthStore.getState().currentUser?.uid).toBe("interrupted_uid");
  });

  // 4. Existing active account login
  it("4. Existing active account login proceeds smoothly", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: "active_uid", email: "mactive@tip.edu.ph", emailVerified: true, reload: jest.fn() },
    });
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ uid: "active_uid", email: "mactive@tip.edu.ph", role: "student", accountState: "ACTIVE" }),
    });

    await useAuthStore.getState().login("mactive@tip.edu.ph", "Pass1234!");

    expect(useAuthStore.getState().currentUser?.uid).toBe("active_uid");
    expect(useAuthStore.getState().error).toBeNull();
  });

  // 5. Existing account with wrong password
  it("5. Existing account with wrong password normalizes error", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({ code: "auth/wrong-password" });

    await useAuthStore.getState().login("mactive@tip.edu.ph", "WrongPass!");

    expect(useAuthStore.getState().error).toBe(MSG_INVALID_CREDENTIAL);
    expect(useAuthStore.getState().authTransactionState).toBe("FAILED");
  });

  // 6. Existing email already in use on register
  it("6. Existing email already in use provides actionable guidance", async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({ code: "auth/email-already-in-use" });

    await useAuthStore.getState().register("mexisting@tip.edu.ph", "Pass1234!", "Existing Student");

    expect(useAuthStore.getState().error).toBe(MSG_EMAIL_ALREADY_IN_USE);
    expect(useAuthStore.getState().authTransactionState).toBe("FAILED");
  });

  // 7. Non-TIP Google account
  it("7. Non-TIP Google account rejects and deletes newly created Auth user", async () => {
    const GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    GoogleSignin.signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "valid_id_token" } });

    const mockFirebaseUser = {
      uid: "gmail_uid",
      email: "user@gmail.com",
      emailVerified: true,
    };
    (signInWithCredential as jest.Mock).mockResolvedValueOnce({ user: mockFirebaseUser });
    (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });

    await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(
      "Only T.I.P. Manila institutional email addresses starting with m and ending in @tip.edu.ph are accepted."
    );
    expect(deleteUser).toHaveBeenCalledWith(mockFirebaseUser);
    expect(signOut).toHaveBeenCalled();
  });

  // 8. Non-TIP email account
  it("8. Non-TIP email account rejects before contacting Firebase Auth", async () => {
    await useAuthStore.getState().register("user@gmail.com", "Pass1234!", "Gmail User");

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(useAuthStore.getState().error).toContain("Only T.I.P. Manila institutional email addresses starting with m and ending in @tip.edu.ph are accepted.");
  });

  // 9. Disabled account on Google login
  it("9. Disabled account on Google login throws paused message", async () => {
    const GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    GoogleSignin.signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "valid_id_token" } });

    const mockFirebaseUser = {
      uid: "disabled_uid",
      email: "mdisabled@tip.edu.ph",
      emailVerified: true,
      getIdToken: jest.fn().mockResolvedValue("tok"),
    };
    (signInWithCredential as jest.Mock).mockResolvedValueOnce({ user: mockFirebaseUser });
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ uid: "disabled_uid", isDisabled: true, accountState: "DISABLED" }),
    });

    await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(ACCOUNT_PAUSED_MSG);
    expect(signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().error).toBe(ACCOUNT_PAUSED_MSG);
  });

  // 10. Deleted account on Google login
  it("10. Deleted account on Google login throws removed message", async () => {
    const GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    GoogleSignin.signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "valid_id_token" } });

    const mockFirebaseUser = {
      uid: "deleted_uid",
      email: "mdeleted@tip.edu.ph",
      emailVerified: true,
      getIdToken: jest.fn().mockResolvedValue("tok"),
    };
    (signInWithCredential as jest.Mock).mockResolvedValueOnce({ user: mockFirebaseUser });
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ uid: "deleted_uid", isDeleted: true, accountState: "DELETED" }),
    });

    await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(ACCOUNT_REMOVED_MSG);
    expect(signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().error).toBe(ACCOUNT_REMOVED_MSG);
  });

  // 11. Global observer is PASSIVE during active authentication transaction (Amendment 1)
  it("11. Global onAuthStateChanged observer is PASSIVE during active transaction", async () => {
    useAuthStore.setState({ authTransactionState: "AUTHENTICATING" });

    // Attach initializeAuth listener
    let authCallback: any = null;
    (onAuthStateChanged as jest.Mock).mockImplementationOnce((_auth, cb) => {
      authCallback = cb;
      return jest.fn();
    });

    useAuthStore.getState().initializeAuth();

    // Trigger onAuthStateChanged with a user that has NO firestore document
    const mockUser = { uid: "active_tx_uid", emailVerified: true, reload: jest.fn() };
    await authCallback(mockUser);

    // Observer must NOT touch getDoc, must NOT call signOut, must NOT terminate
    expect(getDoc).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  // 12. Idempotent createProfileTransaction returns existing active profile
  it("12. Idempotent profile creation handles active profile cleanly", async () => {
    const GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    GoogleSignin.signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "valid_id_token" } });

    const mockFirebaseUser = {
      uid: "existing_active_uid",
      email: "mexisting@tip.edu.ph",
      emailVerified: true,
      getIdToken: jest.fn().mockResolvedValue("tok"),
    };
    (signInWithCredential as jest.Mock).mockResolvedValueOnce({ user: mockFirebaseUser });
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ uid: "existing_active_uid", email: "mexisting@tip.edu.ph", accountState: "ACTIVE" }),
    });

    await useAuthStore.getState().loginWithGoogle();

    expect(mockCreateProfileTransaction).not.toHaveBeenCalled();
    expect(useAuthStore.getState().currentUser?.uid).toBe("existing_active_uid");
  });
});
