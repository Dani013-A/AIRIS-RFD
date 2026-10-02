/**
 * Tests for institutional email validation in authService.
 * Verifies that only exact domain matches are accepted.
 */

// Mock Firebase modules before importing authService
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock("../../config/firebase", () => ({
  auth: {},
  db: {},
}));

// Import after mocks
import { signInAdmin } from "./authService";

describe("isInstitutionalEmail", () => {
  // Valid institutional emails
  it("accepts @tip.edu.ph emails", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "career_center",
        isDisabled: false,
        fullName: "Test User",
        email: "user@tip.edu.ph",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "user@tip.edu.ph" },
    });

    await signInAdmin("user@tip.edu.ph", "password");
    expect(signInWithEmailAndPassword).toHaveBeenCalled();
  });

  it("accepts uppercase @TIP.EDU.PH emails", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "career_center",
        isDisabled: false,
        fullName: "Test User",
        email: "USER@TIP.EDU.PH",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "USER@TIP.EDU.PH" },
    });

    await signInAdmin("USER@TIP.EDU.PH", "password");
    expect(signInWithEmailAndPassword).toHaveBeenCalled();
  });

  it("accepts @airis.edu.ph emails", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "career_center",
        isDisabled: false,
        fullName: "Test User",
        email: "user@airis.edu.ph",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "user@airis.edu.ph" },
    });

    await signInAdmin("user@airis.edu.ph", "password");
    expect(signInWithEmailAndPassword).toHaveBeenCalled();
  });

  // Invalid emails - should be rejected
  it("rejects admin@gmail.com", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword, signOut } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "career_center",
        isDisabled: false,
        fullName: "Test User",
        email: "admin@gmail.com",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "admin@gmail.com" },
    });

    await expect(signInAdmin("admin@gmail.com", "password")).rejects.toThrow(
      "Career Center and OJT Coordinator accounts require an authorized institutional"
    );
    expect(signOut).toHaveBeenCalled();
  });

  it("rejects test@gmail.com", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword, signOut } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "career_center",
        isDisabled: false,
        fullName: "Test User",
        email: "test@gmail.com",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "test@gmail.com" },
    });

    await expect(signInAdmin("test@gmail.com", "password")).rejects.toThrow(
      "Career Center and OJT Coordinator accounts require an authorized institutional"
    );
    expect(signOut).toHaveBeenCalled();
  });

  it("rejects somethingadmin@gmail.com", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword, signOut } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "career_center",
        isDisabled: false,
        fullName: "Test User",
        email: "somethingadmin@gmail.com",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "somethingadmin@gmail.com" },
    });

    await expect(signInAdmin("somethingadmin@gmail.com", "password")).rejects.toThrow(
      "Career Center and OJT Coordinator accounts require an authorized institutional"
    );
    expect(signOut).toHaveBeenCalled();
  });

  it("rejects admin.something@gmail.com", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword, signOut } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "career_center",
        isDisabled: false,
        fullName: "Test User",
        email: "admin.something@gmail.com",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "admin.something@gmail.com" },
    });

    await expect(signInAdmin("admin.something@gmail.com", "password")).rejects.toThrow(
      "Career Center and OJT Coordinator accounts require an authorized institutional"
    );
    expect(signOut).toHaveBeenCalled();
  });

  it("rejects user@tip.edu.ph.com (lookalike domain)", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword, signOut } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "career_center",
        isDisabled: false,
        fullName: "Test User",
        email: "user@tip.edu.ph.com",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "user@tip.edu.ph.com" },
    });

    await expect(signInAdmin("user@tip.edu.ph.com", "password")).rejects.toThrow(
      "Career Center and OJT Coordinator accounts require an authorized institutional"
    );
    expect(signOut).toHaveBeenCalled();
  });

  // Admin role is not subject to email validation (by design)
  it("allows admin role with any email (admin role is not email-restricted)", async () => {
    const { getDoc } = require("firebase/firestore");
    const { signInWithEmailAndPassword } = require("firebase/auth");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "admin",
        isDisabled: false,
        fullName: "Test Admin",
        email: "admin@gmail.com",
      }),
    });

    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "admin@gmail.com" },
    });

    // Admin role should not throw email validation error
    await signInAdmin("admin@gmail.com", "password");
    expect(signInWithEmailAndPassword).toHaveBeenCalled();
  });
});
