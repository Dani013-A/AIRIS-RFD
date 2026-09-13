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
}));

jest.mock("../services/firebase/userService", () => ({
  createProfileTransaction: jest.fn().mockResolvedValue(undefined),
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
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });

      await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(
        "Only verified TIP email accounts ending in @tip.edu.ph can be used to access AIRIS."
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
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });

      await useAuthStore.getState().loginWithGoogle();

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

    it("should NOT auto-recreate and NOT blame admin for returning user with missing profile (isNewUser: false)", async () => {
      const mockFirebaseUser = {
        uid: "orphan_uid",
        email: "orphan@tip.edu.ph",
        emailVerified: true,
        displayName: "Orphan Student",
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null }); // Missing Firestore profile

      await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(ACCOUNT_MISSING_PROFILE_MSG);

      expect(mockCreateProfileTransaction).not.toHaveBeenCalled();
      expect(signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().error).toBe(ACCOUNT_MISSING_PROFILE_MSG);
      expect(useAuthStore.getState().error).not.toContain("paused or deleted by the admin");
    });

    it("should handle distributed boundary: Google signup Auth succeeds but Firestore write fails, subsequent login fails safely without admin accusation", async () => {
      const mockFirebaseUser = {
        uid: "boundary_uid",
        email: "boundary@tip.edu.ph",
        emailVerified: true,
        displayName: "Boundary Student",
      };

      // Attempt 1: Auth succeeds, Firestore transaction throws
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: true });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });
      mockCreateProfileTransaction.mockRejectedValueOnce(new Error("Firestore network write timeout"));

      await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(
        "A database configuration or connection error occurred. Please try again or contact support."
      );
      expect(signOut).toHaveBeenCalled();

      // Attempt 2: User tries again. Firebase Auth user exists (isNewUser: false), Firestore profile still missing
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });

      await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow(ACCOUNT_MISSING_PROFILE_MSG);
      expect(useAuthStore.getState().error).toBe(ACCOUNT_MISSING_PROFILE_MSG);
      expect(useAuthStore.getState().error).not.toContain("paused");
    });

    it("should reject Google login for disabled/paused user with explicit admin paused message", async () => {
      const mockFirebaseUser = {
        uid: "disabled_uid",
        email: "paused@tip.edu.ph",
        emailVerified: true,
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: "disabled_uid",
          email: "paused@tip.edu.ph",
          isDisabled: true,
        }),
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
      };
      (signInWithCredential as jest.Mock).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });
      (getAdditionalUserInfo as jest.Mock).mockReturnValueOnce({ isNewUser: false });
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: "deleted_uid",
          isDeleted: true,
          accountState: "DELETED",
        }),
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
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
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

    it("should reject email login when Firestore profile is missing and not blame admin", async () => {
      const mockUser = {
        uid: "no_profile_uid",
        email: "student@tip.edu.ph",
        emailVerified: true,
        reload: jest.fn().mockResolvedValue(undefined),
      };
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false, data: () => null });

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

    it("should terminate session safely when account profile is MISSING_PROFILE", async () => {
      const mockSet = jest.fn();
      await handleAccountTermination("MISSING_PROFILE", mockSet);

      expect(signOut).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          currentUser: null,
          error: ACCOUNT_MISSING_PROFILE_MSG,
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        "Account Profile Unavailable",
        ACCOUNT_MISSING_PROFILE_MSG,
        expect.any(Array),
        expect.any(Object)
      );
    });
  });
});
