import { registerStudent, linkGoogleToExistingEmailAccount } from "../services/firebase/authService";
import { useAuthStore } from "./authStore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  linkWithCredential,
  deleteUser,
} from "firebase/auth";
import { getDocs, runTransaction } from "firebase/firestore";

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
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
  createUserWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  linkWithCredential: jest.fn(),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  signOut: jest.fn().mockResolvedValue(undefined),
  onAuthStateChanged: jest.fn(),
  getAdditionalUserInfo: jest.fn().mockReturnValue({ isNewUser: true }),
  GoogleAuthProvider: {
    credential: jest.fn().mockReturnValue({ providerId: "google.com" }),
  },
  EmailAuthProvider: {
    credential: jest.fn().mockReturnValue({ providerId: "password" }),
  },
  reauthenticateWithCredential: jest.fn().mockResolvedValue(undefined),
}));

let mockFirestoreUsers: any[] = [];

jest.mock("firebase/firestore", () => ({
  collection: jest.fn().mockReturnValue("users_col"),
  doc: jest.fn().mockImplementation((_db, _col, id) => ({ id })),
  where: jest.fn(),
  query: jest.fn().mockReturnValue("users_query"),
  getDocs: jest.fn().mockImplementation(() => ({
    docs: mockFirestoreUsers.map((u) => ({
      id: u.uid,
      data: () => u,
    })),
  })),
  getDoc: jest.fn().mockImplementation((ref) => {
    const found = mockFirestoreUsers.find((u) => u.uid === ref.id);
    return {
      exists: () => !!found,
      data: () => found || null,
    };
  }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn().mockReturnValue("2026-10-12T00:00:00Z"),
  onSnapshot: jest.fn(),
  runTransaction: jest.fn().mockImplementation(async (_db, updateFunction) => {
    return await updateFunction({
      get: jest.fn().mockResolvedValue({ exists: () => false }),
      set: jest.fn(),
    });
  }),
}));

let mockCurrentUser: any = null;

jest.mock("../config/firebase", () => ({
  get auth() {
    return {
      get currentUser() {
        return mockCurrentUser;
      },
    };
  },
  db: {},
}));

jest.mock("../services/firebase/userService", () => ({
  createProfileTransaction: jest.fn().mockImplementation(async (uid, profile) => profile),
  fetchUserProfile: jest.fn().mockResolvedValue({ role: "student" }),
  deleteUserAccountCascade: jest.fn().mockResolvedValue(undefined),
}));

describe("Account Integrity & Provider Linking Regression Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestoreUsers = [];
    mockCurrentUser = null;
  });

  // Test 1: Google signup followed by email/password signup with the same email
  it("Scenario 1: Google signup exists -> regular signup with same email is blocked without duplicate profile", async () => {
    const existingGoogleUser = {
      uid: "google_uid_001",
      email: "student@tip.edu.ph",
      role: "student",
      accountState: "ACTIVE",
      isDeleted: false,
    };
    mockFirestoreUsers = [existingGoogleUser];

    await expect(
      registerStudent("student@tip.edu.ph", "Password123!", "Juan Dela Cruz")
    ).rejects.toThrow(
      "An account with this TIP email already exists. Try logging in instead, or use Google Sign-In if you registered with Google."
    );

    // Auth create user must not be called when existing profile detected
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  // Test 2: Email/password signup followed by Google sign-in with the same email
  it("Scenario 2: Email/password signup exists -> Google sign-in with same email detects conflict and prevents duplicate profile", async () => {
    const existingPwUser = {
      uid: "pw_uid_002",
      email: "student@tip.edu.ph",
      role: "student",
      accountState: "ACTIVE",
      isDeleted: false,
    };
    mockFirestoreUsers = [existingPwUser];

    // Mock Google sign-in returning a new UID from Google
    const newGoogleAuthUser = {
      uid: "different_google_uid_999",
      email: "student@tip.edu.ph",
      emailVerified: true,
      displayName: "Juan Dela Cruz",
      getIdToken: jest.fn().mockResolvedValue("token_123"),
      providerData: [{ providerId: "google.com" }],
    };

    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: "success",
      data: { idToken: "valid_google_token" },
    });

    (signInWithCredential as jest.Mock).mockResolvedValueOnce({
      user: newGoogleAuthUser,
    });

    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "mock_client_id";

    const { loginWithGoogle } = useAuthStore.getState();

    await expect(loginWithGoogle()).rejects.toThrow(
      "No AIRIS account found. Please sign up to continue."
    );

    // Must delete the orphaned new auth user to prevent duplicate accounts
    expect(deleteUser).toHaveBeenCalledWith(newGoogleAuthUser);
  });

  // Test 3: Existing account with a different provider returns clear recovery instruction
  it("Scenario 3: Firebase account-exists-with-different-credential returns clear sign-in instruction", async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: "success",
      data: { idToken: "valid_google_token" },
    });

    const error: any = new Error("Account exists with different credential");
    error.code = "auth/account-exists-with-different-credential";
    (signInWithCredential as jest.Mock).mockRejectedValueOnce(error);

    const { loginWithGoogle } = useAuthStore.getState();

    await expect(loginWithGoogle()).rejects.toThrow(
      "An AIRIS account already exists for this TIP email using another sign-in method. Please log in using your original method first."
    );
  });

  // Test 4: Provider linking after successful authentication
  it("Scenario 4: Links Google credential to existing account only after authenticating ownership of both credentials", async () => {
    const existingPwUser = {
      uid: "pw_uid_004",
      email: "student@tip.edu.ph",
      role: "student",
      fullName: "Maria Clara",
    };
    mockFirestoreUsers = [existingPwUser];

    const mockAuthUser = {
      uid: "pw_uid_004",
      email: "student@tip.edu.ph",
    };

    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: mockAuthUser,
    });
    (linkWithCredential as jest.Mock).mockResolvedValueOnce({
      user: mockAuthUser,
    });

    const mockGoogleCred = { providerId: "google.com", idToken: "google_token_xyz" };

    const result = await linkGoogleToExistingEmailAccount(
      "student@tip.edu.ph",
      "CorrectPassword123!",
      mockGoogleCred
    );

    // Verified ownership with password first
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "student@tip.edu.ph",
      "CorrectPassword123!"
    );
    // Linked credentials
    expect(linkWithCredential).toHaveBeenCalledWith(mockAuthUser, mockGoogleCred);
    // Preserved original UID
    expect(result.uid).toBe("pw_uid_004");
  });

  // Test 5: Concurrent signup attempts
  it("Scenario 5: Concurrent signup race condition is safely intercepted and orphaned user deleted", async () => {
    // Initially no user returned in check 1
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) // first check: empty
      .mockResolvedValueOnce({ // second check during transaction: competitor appeared
        docs: [
          {
            id: "competitor_uid_777",
            data: () => ({
              uid: "competitor_uid_777",
              email: "student@tip.edu.ph",
              isDeleted: false,
              accountState: "ACTIVE",
            }),
          },
        ],
      });

    const newAuthUser = {
      uid: "my_uid_888",
      email: "student@tip.edu.ph",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: newAuthUser,
    });

    await expect(
      registerStudent("student@tip.edu.ph", "Pass12345!", "Rival Student")
    ).rejects.toThrow("An account with this TIP email already exists.");

    // Orphaned competing auth user must be cleaned up
    expect(deleteUser).toHaveBeenCalledWith(newAuthUser);
  });

  // Test 6: Preservation of existing UID and student data
  it("Scenario 6: Account linking preserves original Firebase UID, student data, and role assignments", async () => {
    const originalStudentProfile = {
      uid: "original_uid_canonical",
      email: "student@tip.edu.ph",
      role: "student",
      fullName: "Jose Rizal",
      activeResumeId: "resume_doc_123",
      degreeProgram: "BSIT",
      targetPosition: "Software Engineer",
    };
    mockFirestoreUsers = [originalStudentProfile];

    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: "original_uid_canonical" },
    });
    (linkWithCredential as jest.Mock).mockResolvedValueOnce(undefined);

    const linkedProfile = await linkGoogleToExistingEmailAccount(
      "student@tip.edu.ph",
      "Password123!",
      { idToken: "token" }
    );

    expect(linkedProfile.uid).toBe("original_uid_canonical");
    expect(linkedProfile.activeResumeId).toBe("resume_doc_123");
    expect(linkedProfile.degreeProgram).toBe("BSIT");
    expect(linkedProfile.role).toBe("student");
  });

  // Test 7: Failed linking and recovery without data loss
  it("Scenario 7: Failed linking due to wrong password leaves existing account intact without data loss", async () => {
    const existingAccount = {
      uid: "protected_student_uid",
      email: "student@tip.edu.ph",
      role: "student",
      fullName: "Andres Bonifacio",
    };
    mockFirestoreUsers = [existingAccount];

    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce(
      new Error("auth/wrong-password")
    );

    await expect(
      linkGoogleToExistingEmailAccount(
        "student@tip.edu.ph",
        "WrongPassword!",
        { idToken: "token" }
      )
    ).rejects.toThrow("auth/wrong-password");

    // linkWithCredential and deleteUser must NOT be called on failure
    expect(linkWithCredential).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    // Data remains completely intact in Firestore
    expect(mockFirestoreUsers[0].uid).toBe("protected_student_uid");
  });
});
