import {
  handleAccountSuspendedOrDeleted,
  ACCOUNT_SUSPENDED_OR_DELETED_MSG,
  stopUserRealtimeListener,
} from "./authStore";
import { Alert } from "react-native";
import { signOut } from "firebase/auth";
import { mapAuthError } from "../utils/errorMapper";

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: {},
  signInWithCredential: jest.fn(),
  getAdditionalUserInfo: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock("../config/firebase", () => ({
  auth: { currentUser: { uid: "test_user_1", reload: jest.fn() } },
  db: {},
}));

describe("Account Deletion and Suspension Immediate Logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    stopUserRealtimeListener();
  });

  it("should have exact required suspension/deletion message constant", () => {
    expect(ACCOUNT_SUSPENDED_OR_DELETED_MSG).toBe("Your account has been paused by an administrator. Please contact your department for assistance.");
  });

  it("should log out immediately and set exact error message when account is paused or deleted", async () => {
    const mockSet = jest.fn();

    await handleAccountSuspendedOrDeleted(mockSet);

    expect(signOut).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUser: null,
        loading: false,
        error: "Your account has been paused by an administrator. Please contact your department for assistance.",
      })
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Account Inactive",
      "Your account has been paused by an administrator. Please contact your department for assistance.",
      expect.any(Array),
      expect.any(Object)
    );
  });

  it("should map auth/user-disabled to the exact required message in errorMapper", () => {
    const errorObj = { code: "auth/user-disabled", message: "The user account has been disabled." };
    const mapped = mapAuthError(errorObj);
    expect(mapped).toBe("Your account has been paused by an administrator. Please contact your department for assistance.");
  });

  it("should map explicit suspension error to the exact required message in errorMapper", () => {
    const errorObj = new Error("your account has been paused or deleted by the admin");
    const mapped = mapAuthError(errorObj);
    expect(mapped).toBe("Your account has been paused by an administrator. Please contact your department for assistance.");
  });
});
