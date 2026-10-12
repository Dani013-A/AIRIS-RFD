import { useAuthStore } from "./authStore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { deleteUserAccountCascade } from "../services/firebase/userService";
import { reauthenticateWithCredential } from "firebase/auth";

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
  },
}));

jest.mock("../services/firebase/userService", () => ({
  deleteUserAccountCascade: jest.fn().mockResolvedValue(undefined),
  fetchUserProfile: jest.fn().mockResolvedValue({ role: "student" }),
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: {
    credential: jest.fn().mockReturnValue({ providerId: "google.com" }),
  },
  EmailAuthProvider: {
    credential: jest.fn().mockReturnValue({ providerId: "password" }),
  },
  reauthenticateWithCredential: jest.fn().mockResolvedValue(undefined),
  deleteUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(),
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

describe("Provider-Aware Account Deletion Unit & Confirmation Phrase Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Confirmation Phrase Strictness ('CONFIRM DELETION')", () => {
    it("rejects blank confirmation phrase and does not delete user data", async () => {
      mockCurrentUser = {
        uid: "google_student_1",
        email: "student@tip.edu.ph",
        providerData: [{ providerId: "google.com" }],
      };

      useAuthStore.setState({
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
      });

      const { deleteAccountAction } = useAuthStore.getState();

      await expect(deleteAccountAction("")).rejects.toThrow(
        "Confirmation phrase mismatch. You must enter 'CONFIRM DELETION' to proceed."
      );
      await expect(deleteAccountAction("   ")).rejects.toThrow(
        "Confirmation phrase mismatch. You must enter 'CONFIRM DELETION' to proceed."
      );

      expect(deleteUserAccountCascade).not.toHaveBeenCalled();
    });

    it("rejects incorrect capitalization (case-sensitive requirement)", async () => {
      mockCurrentUser = {
        uid: "google_student_1",
        email: "student@tip.edu.ph",
        providerData: [{ providerId: "google.com" }],
      };

      useAuthStore.setState({
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
      });

      const { deleteAccountAction } = useAuthStore.getState();

      await expect(deleteAccountAction("confirm deletion")).rejects.toThrow(
        "Confirmation phrase mismatch. You must enter 'CONFIRM DELETION' to proceed."
      );
      await expect(deleteAccountAction("Confirm Deletion")).rejects.toThrow(
        "Confirmation phrase mismatch. You must enter 'CONFIRM DELETION' to proceed."
      );

      expect(deleteUserAccountCascade).not.toHaveBeenCalled();
    });

    it("rejects extra, missing, or incorrect characters", async () => {
      mockCurrentUser = {
        uid: "google_student_1",
        email: "student@tip.edu.ph",
        providerData: [{ providerId: "google.com" }],
      };

      useAuthStore.setState({
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
      });

      const { deleteAccountAction } = useAuthStore.getState();

      await expect(deleteAccountAction("CONFIRM DELETIONS")).rejects.toThrow(
        "Confirmation phrase mismatch. You must enter 'CONFIRM DELETION' to proceed."
      );
      await expect(deleteAccountAction("CONFIRM")).rejects.toThrow(
        "Confirmation phrase mismatch. You must enter 'CONFIRM DELETION' to proceed."
      );
      await expect(deleteAccountAction("DELETE")).rejects.toThrow(
        "Confirmation phrase mismatch. You must enter 'CONFIRM DELETION' to proceed."
      );

      expect(deleteUserAccountCascade).not.toHaveBeenCalled();
    });

    it("handles whitespace trimming properly when phrase is exact 'CONFIRM DELETION'", async () => {
      mockCurrentUser = {
        uid: "google_student_1",
        email: "student@tip.edu.ph",
        providerData: [{ providerId: "google.com" }],
      };

      useAuthStore.setState({
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
      });

      (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
        type: "success",
        data: { idToken: "valid_google_token_123" },
      });

      const { deleteAccountAction } = useAuthStore.getState();

      // Leading and trailing spaces should be trimmed
      await deleteAccountAction("   CONFIRM DELETION   ");

      expect(deleteUserAccountCascade).toHaveBeenCalledWith("google_student_1");
    });
  });

  describe("Provider-Aware Flows & Reauthentication", () => {
    it("Google user: requires Google OAuth reauthentication and cancels safely if aborted", async () => {
      mockCurrentUser = {
        uid: "google_student_1",
        email: "student@tip.edu.ph",
        providerData: [{ providerId: "google.com" }],
      };

      useAuthStore.setState({
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
      });

      // Mock Google sign-in cancelled
      (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
        type: "cancelled",
      });

      const { deleteAccountAction } = useAuthStore.getState();

      await expect(deleteAccountAction("CONFIRM DELETION")).rejects.toThrow(
        "Google reauthentication was cancelled."
      );

      // Cascade deletion and auth delete must NOT have been called!
      expect(deleteUserAccountCascade).not.toHaveBeenCalled();
    });

    it("Google user: successfully completes reauthentication and proceeds with cascade deletion", async () => {
      mockCurrentUser = {
        uid: "google_student_1",
        email: "student@tip.edu.ph",
        providerData: [{ providerId: "google.com" }],
      };

      useAuthStore.setState({
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
      });

      (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
        type: "success",
        data: { idToken: "valid_google_token_123" },
      });

      const { deleteAccountAction } = useAuthStore.getState();

      await deleteAccountAction("CONFIRM DELETION");

      expect(GoogleSignin.signIn).toHaveBeenCalled();
      expect(deleteUserAccountCascade).toHaveBeenCalledWith("google_student_1");
    });

    it("Password user: succeeds with valid password reauthentication", async () => {
      mockCurrentUser = {
        uid: "pw_student_1",
        email: "student@tip.edu.ph",
        providerData: [{ providerId: "password" }],
      };

      useAuthStore.setState({
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
      });

      const { deleteAccountAction } = useAuthStore.getState();

      await deleteAccountAction("CONFIRM DELETION", "MySecretPass123!");

      expect(reauthenticateWithCredential).toHaveBeenCalled();
      expect(deleteUserAccountCascade).toHaveBeenCalledWith("pw_student_1");
    });

    it("Password user: aborts deletion and preserves data if reauthentication fails", async () => {
      (reauthenticateWithCredential as jest.Mock).mockRejectedValueOnce(
        new Error("auth/wrong-password")
      );

      mockCurrentUser = {
        uid: "pw_student_1",
        email: "student@tip.edu.ph",
        providerData: [{ providerId: "password" }],
      };

      useAuthStore.setState({
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
      });

      const { deleteAccountAction } = useAuthStore.getState();

      await expect(deleteAccountAction("CONFIRM DELETION", "wrong_password")).rejects.toThrow(
        "auth/wrong-password"
      );

      expect(deleteUserAccountCascade).not.toHaveBeenCalled();
    });

    it("Unauthenticated session: rejects deletion attempt cleanly without side effects", async () => {
      mockCurrentUser = null;

      useAuthStore.setState({
        currentUser: null,
        loading: false,
        error: null,
      });

      const { deleteAccountAction } = useAuthStore.getState();

      await expect(deleteAccountAction("CONFIRM DELETION")).rejects.toThrow(
        "No authenticated user session found."
      );

      expect(deleteUserAccountCascade).not.toHaveBeenCalled();
    });
  });
});
