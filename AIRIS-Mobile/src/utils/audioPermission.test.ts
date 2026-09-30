import {
  checkMicrophonePermission,
  requestMicrophonePermission,
  openMicrophoneSettings,
} from "./audioPermission";
import { PermissionsAndroid, Platform, Linking } from "react-native";
import * as ExpoAudio from "expo-audio";

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  PermissionsAndroid: {
    PERMISSIONS: {
      RECORD_AUDIO: "android.permission.RECORD_AUDIO",
    },
    RESULTS: {
      GRANTED: "granted",
      DENIED: "denied",
      NEVER_ASK_AGAIN: "never_ask_again",
    },
    check: jest.fn(),
    request: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
}));

jest.mock("expo-audio", () => ({
  getRecordingPermissionsAsync: jest.fn(),
  requestRecordingPermissionsAsync: jest.fn(),
}));

describe("audioPermission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = "android";
  });

  describe("checkMicrophonePermission", () => {
    it("returns true on Android when RECORD_AUDIO is granted", async () => {
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue(true);
      const result = await checkMicrophonePermission();
      expect(result).toBe(true);
      expect(PermissionsAndroid.check).toHaveBeenCalledWith("android.permission.RECORD_AUDIO");
    });

    it("returns false on Android when RECORD_AUDIO is not granted", async () => {
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
      const result = await checkMicrophonePermission();
      expect(result).toBe(false);
    });

    it("handles PermissionsAndroid.check errors gracefully", async () => {
      (PermissionsAndroid.check as jest.Mock).mockRejectedValue(new Error("Native error"));
      const result = await checkMicrophonePermission();
      expect(result).toBe(false);
    });

    it("falls back to expo-audio on iOS", async () => {
      (Platform as any).OS = "ios";
      (ExpoAudio.getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      const result = await checkMicrophonePermission();
      expect(result).toBe(true);
      expect(ExpoAudio.getRecordingPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe("requestMicrophonePermission", () => {
    it("returns granted immediately on Android if already granted", async () => {
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue(true);
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ granted: true, canAskAgain: true, status: "granted" });
      expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    });

    it("requests permission and returns granted when user allows", async () => {
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue("granted");
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ granted: true, canAskAgain: true, status: "granted" });
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        "android.permission.RECORD_AUDIO",
        expect.any(Object)
      );
    });

    it("returns denied when user denies permission", async () => {
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue("denied");
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ granted: false, canAskAgain: true, status: "denied" });
    });

    it("returns blocked when user checks don't ask again (NEVER_ASK_AGAIN)", async () => {
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue("never_ask_again");
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ granted: false, canAskAgain: false, status: "blocked" });
    });

    it("handles request errors gracefully on Android", async () => {
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
      (PermissionsAndroid.request as jest.Mock).mockRejectedValue(new Error("Activity destroyed"));
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ granted: false, canAskAgain: true, status: "denied" });
    });

    it("uses expo-audio on iOS and detects blocked permission", async () => {
      (Platform as any).OS = "ios";
      (ExpoAudio.requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ granted: false, canAskAgain: false, status: "blocked" });
    });
  });

  describe("openMicrophoneSettings", () => {
    it("calls Linking.openSettings", async () => {
      await openMicrophoneSettings();
      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });
});
