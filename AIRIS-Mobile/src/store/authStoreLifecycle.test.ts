import {
  determineAccountLifecycleState,
  ACCOUNT_PAUSED_MSG,
  ACCOUNT_REMOVED_MSG,
  ACCOUNT_MISSING_PROFILE_MSG,
  handleAccountTermination,
  useAuthStore,
  stopUserRealtimeListener,
} from "./authStore";
import { loginUser, registerStudent, EmailNotVerifiedError } from "../services/firebase/authService";
import { Alert } from "react-native";
import {
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithCredential,
  getAdditionalUserInfo,
  deleteUser,
} from "firebase/auth";
import { getDoc, doc, setDoc } from "firebase/firestore";
import type { AppUser } from "../types/user.types";

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({
      type: "success",
      data: {
        idToken: "mock-google-id-token",
      },
    }),
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
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: {
    credential: jest.fn((idToken: string) => ({ idToken, providerId: "google.com" })),
  },
  signInWithCredential: jest.fn(),
  getAdditionalUserInfo: jest.fn(),
  deleteUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db: any, _col: string, id: string) => ({ id, path: `${_col}/${id}` })),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, data: () => null }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => "2026-09-13T00:00:00Z"),
  runTransaction: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
}));

jest.mock("../services/api/otpService", () => ({
  getStoredStudentOtpSession: jest.fn().mockResolvedValue({ sessionToken: "mock_tok", expiresAt: Date.now() + 100000 }),
  sendStudentOtp: jest.fn().mockResolvedValue({ success: true, maskedEmail: "s****t@tip.edu.ph" }),
  verifyStudentOtp: jest.fn().mockResolvedValue({ success: true, sessionToken: "mock_tok" }),
  storeStudentOtpSession: jest.fn().mockResolvedValue(undefined),
  clearStudentOtpSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../services/firebase/userService", () => ({
  createProfileTransaction: jest.fn().mockImplementation((_uid: string, profile: any) => Promise.resolve(profile)),
  updateProfileDetails: jest.fn(),
  deleteUserAccountCascade: jest.fn(),
  completeUserOnboardingWithConsents: jest.fn(),
}));

jest.mock("../config/firebase", () => ({
  auth: {
    currentUser: {
      uid: "test_uid",
      email: "student@tip.edu.ph",
      emailVerified: true,
      reload: jest.fn().mockResolvedValue(undefined),
    },
  },
  db: {},
}));

const mockCreateProfileTransaction = jest.requireMock("../services/firebase/userService").createProfileTransaction;

describe("Account Lifecycle State Architecture & Deterministic Precedence", () => {
  describe("State Precedence Matrix: DELETED -> DISABLED -> ACTIVE", () => {
    it("should prioritize DELETED/REMOVED even if isDisabled is also true", () => {
      const user: Partial<AppUser> = {
        uid: "uid_1",
        isDisabled: true,
        isDeleted: true,
        accountState: "DELETED",
      };
      expect(determineAccountLifecycleState(true, user)).toBe("DELETED_REMOVED");
    });

    it("should classify as DISABLED/PAUSED when isDisabled is true and not deleted", () => {
      const user: Partial<AppUser> = {
        uid: "uid_2",
        isDisabled: true,
        isDeleted: false,
        accountState: "DISABLED",
      };
      expect(determineAccountLifecycleState(true, user)).toBe("DISABLED_PAUSED");
    });

    it("should classify as ACTIVE when document exists and neither disabled nor deleted", () => {
      const user: Partial<AppUser> = {
        uid: "uid_3",
        isDisabled: false,
        isDeleted: false,
        accountState: "ACTIVE",
      };
      expect(determineAccountLifecycleState(true, user)).toBe("ACTIVE");
    });

    it("should strictly classify missing document as MISSING_PROFILE (never automatically deleted or disabled)", () => {
      expect(determineAccountLifecycleState(false, null)).toBe("MISSING_PROFILE");
      expect(determineAccountLifecycleState(false, undefined)).toBe("MISSING_PROFILE");
    });
  });

  describe("Google Authentication Flow Scenarios", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      stopUserRealtimeListener();
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
      useAuthStore.setState({
        currentUser: null,
        loading: false,
        isGoogleLoading: false,
        error: null,
      });
    });

    it("should reject non-TIP Google email and delete newly created Auth user", async () => {
      const mockFirebaseUser = {
        uid: "ext_uid",
        email: "student@gmail.com",
        emailVerified: true,
        displayName: "External Student",
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });

      await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(
        "Please use your official @tip.edu.ph account."
      );
      expect(deleteUser).toHaveBeenCalledWith(mockFirebaseUser);
      expect(signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().currentUser).toBeNull();
    });

    it("should allow first-time Google signup (isNewUser: true) to initialize profile", async () => {
      const mockFirebaseUser = {
        uid: "new_tip_uid",
        email: "newstudent@tip.edu.ph",
        emailVerified: true,
        displayName: "TIP New Student",
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });

      await useAuthStore.getState().loginWithGoogle(true);

      expect(mockFirebaseUser.getIdToken).toHaveBeenCalledWith(true);
      expect(mockCreateProfileTransaction).toHaveBeenCalledWith(
        "new_tip_uid",
        expect.objectContaining({
          uid: "new_tip_uid",
          email: "newstudent@tip.edu.ph",
          role: "student",
          accountState: "ACTIVE",
          isDeleted: false,
          isDisabled: false,
        })
      );
      expect(useAuthStore.getState().currentUser).not.toBeNull();
      expect(useAuthStore.getState().error).toBeNull();
    });

    it("should recover legitimate interrupted registration when Firebase Auth user exists but profile was not created", async () => {
      const mockFirebaseUser = {
        uid: "interrupted_uid",
        email: "interrupted@tip.edu.ph",
        emailVerified: true,
        displayName: "Interrupted Student",
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      // Auth user exists (isNewUser: false), but Firestore profile is missing (interrupted setup)
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });

      // Registration intent (RegisterScreen) safely provisions missing profile
      await useAuthStore.getState().loginWithGoogle(true);

      expect(mockFirebaseUser.getIdToken).toHaveBeenCalledWith(true);
      expect(mockCreateProfileTransaction).toHaveBeenCalledWith(
        "interrupted_uid",
        expect.objectContaining({
          uid: "interrupted_uid",
          email: "interrupted@tip.edu.ph",
          role: "student",
          accountState: "ACTIVE",
          isDeleted: false,
          isDisabled: false,
        })
      );
      expect(useAuthStore.getState().currentUser).not.toBeNull();
      expect(useAuthStore.getState().error).toBeNull();
    });

    it("should log in existing ACTIVE Google user without recreating profile", async () => {
      const mockFirebaseUser = {
        uid: "active_user_uid",
        email: "active@tip.edu.ph",
        emailVerified: true,
        displayName: "Active Student",
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: "active_user_uid",
          email: "active@tip.edu.ph",
          role: "student",
          accountState: "ACTIVE",
          isDeleted: false,
          isDisabled: false,
        }),
      });

      await useAuthStore.getState().loginWithGoogle();

      expect(mockFirebaseUser.getIdToken).toHaveBeenCalledWith(true);
      expect(mockCreateProfileTransaction).not.toHaveBeenCalled();
      expect(useAuthStore.getState().currentUser).toEqual(
        expect.objectContaining({
          uid: "active_user_uid",
          email: "active@tip.edu.ph",
          accountState: "ACTIVE",
        })
      );
      expect(useAuthStore.getState().error).toBeNull();
    });

    it("should allow existing Google user with incomplete profile to log in without re-registering", async () => {
      const mockFirebaseUser = {
        uid: "incomplete_uid",
        email: "incomplete@tip.edu.ph",
        emailVerified: true,
        displayName: "Incomplete Student",
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: "incomplete_uid",
          email: "incomplete@tip.edu.ph",
          role: "student",
          accountState: "ACTIVE",
          isDeleted: false,
          isDisabled: false,
          isProfileComplete: false,
          hasCompletedOnboarding: false,
        }),
      });

      await useAuthStore.getState().loginWithGoogle(false);

      expect(mockCreateProfileTransaction).not.toHaveBeenCalled();
      expect(useAuthStore.getState().currentUser?.uid).toBe("incomplete_uid");
      expect(useAuthStore.getState().currentUser?.hasCompletedOnboarding).toBe(false);
    });

    it("should normalize permission-denied error without leaking raw technical strings", async () => {
      const mockFirebaseUser = {
        uid: "perm_err_uid",
        email: "perm@tip.edu.ph",
        emailVerified: true,
        displayName: "Perm Student",
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };

      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });
      mockCreateProfileTransaction.mockRejectedValueOnce(new Error("Missing or insufficient permissions."));

      await expect(useAuthStore.getState().loginWithGoogle(true)).rejects.toThrow(
        "We couldn't finish setting up your account. Please try again."
      );
      expect(signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().error).toBe(
        "We couldn't finish setting up your account. Please try again."
      );
    });

    it("should reject Google login on login screen when user is new and not registered", async () => {
      const mockFirebaseUser = {
        uid: "unregistered_uid",
        email: "unregistered@tip.edu.ph",
        emailVerified: true,
        displayName: "Unregistered Student",
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
        providerData: [{ providerId: "google.com" }],
      };

      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });

      await expect(useAuthStore.getState().loginWithGoogle(false)).rejects.toThrow(
        "No AIRIS account found. Please sign up to continue."
      );
      expect(deleteUser).toHaveBeenCalledWith(mockFirebaseUser);
      expect(mockCreateProfileTransaction).not.toHaveBeenCalled();
      expect(signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().pendingGoogleEmail).toBe("unregistered@tip.edu.ph");
    });

    it("should safely sign out and surface guidance even if deleteUser fails during cleanup", async () => {
      const mockFirebaseUser = {
        uid: "unregistered_fail_del_uid",
        email: "unregistered_fail@tip.edu.ph",
        emailVerified: true,
        displayName: "Unregistered Student",
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
        providerData: [{ providerId: "google.com" }],
      };

      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });
      (deleteUser as jest.Mock).mockRejectedValueOnce(new Error("Firebase network error"));

      await expect(useAuthStore.getState().loginWithGoogle(false)).rejects.toThrow(
        "No AIRIS account found. Please sign up to continue."
      );
      expect(signOut).toHaveBeenCalled();
      expect(mockCreateProfileTransaction).not.toHaveBeenCalled();
      expect(useAuthStore.getState().error).toBe(
        "No AIRIS account found. Please sign up to continue."
      );
      expect(useAuthStore.getState().pendingGoogleEmail).toBe("unregistered_fail@tip.edu.ph");
    });

    it("should handle Google sign-in cancellation silently without error banner", async () => {
      const GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
      const statusCodes = require("@react-native-google-signin/google-signin").statusCodes;
      GoogleSignin.signIn.mockRejectedValueOnce({ code: statusCodes.SIGN_IN_CANCELLED });

      await useAuthStore.getState().loginWithGoogle();

      expect(useAuthStore.getState().authTransactionState).toBe("IDLE");
      expect(useAuthStore.getState().error).toBeNull();
    });

    it("should surface connection failure message on Google network error", async () => {
      const GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
      GoogleSignin.signIn.mockRejectedValueOnce({ code: "NETWORK_ERROR", message: "Network error" });

      await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(
        "Network error. Please check your internet connection."
      );
      expect(useAuthStore.getState().authTransactionState).toBe("FAILED");
      expect(useAuthStore.getState().error).toBe("Network error. Please check your internet connection.");
    });

    it("should reject Google login for disabled/paused user with explicit admin paused message", async () => {
      const mockFirebaseUser = {
        uid: "disabled_uid",
        email: "paused@tip.edu.ph",
        emailVerified: true,
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: "disabled_uid", isDisabled: true, accountState: "DISABLED" }),
      });

      await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(ACCOUNT_PAUSED_MSG);
      expect(signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().error).toBe(ACCOUNT_PAUSED_MSG);
    });

    it("should reject Google login for deleted user with explicit account removed message", async () => {
      const mockFirebaseUser = {
        uid: "deleted_uid",
        email: "deleted@tip.edu.ph",
        emailVerified: true,
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: "deleted_uid", isDeleted: true, accountState: "DELETED" }),
      });

      await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(ACCOUNT_REMOVED_MSG);
      expect(signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().error).toBe(ACCOUNT_REMOVED_MSG);
    });
  });

  describe("Email/Password Authentication Flow Scenarios", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should reject non-TIP email signup before reaching Firebase", async () => {
      await expect(registerStudent("attacker@gmail.com", "SecurePass123!", "Attacker")).rejects.toThrow(
        "Only TIP email addresses are allowed."
      );
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it("should register valid TIP email and record ACTIVE lifecycle status", async () => {
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
        user: { uid: "email_reg_uid", email: "newstudent@tip.edu.ph" },
      });

      const user = await registerStudent("newstudent@tip.edu.ph", "ValidPass123!", "New Student");

      expect(user.accountState).toBe("ACTIVE");
      expect(user.isDeleted).toBe(false);
      expect(user.isDisabled).toBe(false);
      expect(sendEmailVerification).toHaveBeenCalled();
      expect(mockCreateProfileTransaction).toHaveBeenCalledWith(
        "email_reg_uid",
        expect.objectContaining({
          accountState: "ACTIVE",
          isDeleted: false,
          isDisabled: false,
        })
      );
      expect(signOut).toHaveBeenCalled();
    });

    it("should reject email login before verification", async () => {
      const mockUser = {
        uid: "unverified_uid",
        email: "student@tip.edu.ph",
        emailVerified: false,
        reload: jest.fn().mockResolvedValue(undefined),
      };
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });

      await expect(loginUser("student@tip.edu.ph", "Pass123!")).rejects.toThrow(EmailNotVerifiedError);
    });

    it("should recover missing Firestore profile during email login for existing Auth user", async () => {
      const mockUser = {
        uid: "no_profile_uid",
        email: "student@tip.edu.ph",
        emailVerified: true,
        reload: jest.fn().mockResolvedValue(undefined),
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });
      mockCreateProfileTransaction.mockResolvedValueOnce({
        uid: "no_profile_uid",
        email: "student@tip.edu.ph",
        fullName: "TIP Student",
        role: "student",
        accountState: "ACTIVE",
        isDeleted: false,
        isDisabled: false,
      });

      const user = await loginUser("student@tip.edu.ph", "Pass123!");
      expect(mockCreateProfileTransaction).toHaveBeenCalledWith(
        "no_profile_uid",
        expect.objectContaining({
          uid: "no_profile_uid",
          email: "student@tip.edu.ph",
          accountState: "ACTIVE",
        })
      );
      expect(user.uid).toBe("no_profile_uid");
    });

    it("should reject email login when missing profile recovery fails", async () => {
      const mockUser = {
        uid: "fail_profile_uid",
        email: "student@tip.edu.ph",
        emailVerified: true,
        reload: jest.fn().mockResolvedValue(undefined),
        getIdToken: jest.fn().mockResolvedValue("mock_token"),
      };
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });
      mockCreateProfileTransaction.mockRejectedValueOnce(new Error("Write failed"));

      await expect(loginUser("student@tip.edu.ph", "Pass123!")).rejects.toThrow(ACCOUNT_MISSING_PROFILE_MSG);
      expect(signOut).toHaveBeenCalled();
    });

    it("should reject email login when account is paused by admin", async () => {
      const mockUser = {
        uid: "paused_uid",
        email: "paused@tip.edu.ph",
        emailVerified: true,
        reload: jest.fn().mockResolvedValue(undefined),
      };
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: "paused_uid", email: "paused@tip.edu.ph", isDisabled: true }),
      });

      await expect(loginUser("paused@tip.edu.ph", "Pass123!")).rejects.toThrow(ACCOUNT_PAUSED_MSG);
      expect(signOut).toHaveBeenCalled();
    });

    it("should reject email login when account is deleted", async () => {
      const mockUser = {
        uid: "deleted_email_uid",
        email: "deleted@tip.edu.ph",
        emailVerified: true,
        reload: jest.fn().mockResolvedValue(undefined),
      };
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: "deleted_email_uid", isDeleted: true, accountState: "DELETED" }),
      });

      await expect(loginUser("deleted@tip.edu.ph", "Pass123!")).rejects.toThrow(ACCOUNT_REMOVED_MSG);
      expect(signOut).toHaveBeenCalled();
    });
  });

  describe("Session Validity Verification & Termination Handlers", () => {
    it("should terminate session safely when account is marked DELETED_REMOVED", async () => {
      const mockSet = jest.fn();
      await handleAccountTermination("DELETED_REMOVED", mockSet);

      expect(signOut).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          currentUser: null,
          error: ACCOUNT_REMOVED_MSG,
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        "Account Removed",
        ACCOUNT_REMOVED_MSG,
        expect.any(Array),
        expect.any(Object)
      );
    });
  });
});
