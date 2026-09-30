import { PermissionsAndroid, Platform, Linking } from "react-native";
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from "expo-audio";

export interface PermissionStatusResult {
  granted: boolean;
  canAskAgain: boolean;
  status: "granted" | "denied" | "blocked" | "undetermined";
}

/**
 * Checks whether microphone (RECORD_AUDIO) permission is granted.
 * Non-blocking, never prompts.
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    } catch (e) {
      console.warn("[audioPermission] Failed to check PermissionsAndroid:", e);
      return false;
    }
  }

  try {
    const status = await getRecordingPermissionsAsync();
    return !!status.granted;
  } catch (e) {
    console.warn("[audioPermission] Failed to check getRecordingPermissionsAsync:", e);
    return false;
  }
}

/**
 * Requests microphone (RECORD_AUDIO) permission at runtime.
 * Handles Android 6+ runtime prompt, 'granted', 'denied', and 'never_ask_again' (blocked).
 */
export async function requestMicrophonePermission(): Promise<PermissionStatusResult> {
  if (Platform.OS === "android") {
    try {
      const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (alreadyGranted) {
        return { granted: true, canAskAgain: true, status: "granted" };
      }

      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone Access Required",
          message: "AIRIS requires microphone access to detect your voice and process your responses during the VR interview.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        }
      );

      if (res === PermissionsAndroid.RESULTS.GRANTED) {
        return { granted: true, canAskAgain: true, status: "granted" };
      } else if (res === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return { granted: false, canAskAgain: false, status: "blocked" };
      } else {
        return { granted: false, canAskAgain: true, status: "denied" };
      }
    } catch (e) {
      console.warn("[audioPermission] Failed to request PermissionsAndroid:", e);
      return { granted: false, canAskAgain: true, status: "denied" };
    }
  }

  // iOS / Web / Other platforms fallback via expo-audio
  try {
    const res = await requestRecordingPermissionsAsync();
    return {
      granted: !!res.granted,
      canAskAgain: res.canAskAgain !== false,
      status: res.granted ? "granted" : res.canAskAgain === false ? "blocked" : "denied",
    };
  } catch (e) {
    console.warn("[audioPermission] Failed to requestRecordingPermissionsAsync:", e);
    return { granted: false, canAskAgain: true, status: "denied" };
  }
}

/**
 * Direct link to application settings when permission has been permanently denied.
 */
export async function openMicrophoneSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.warn("[audioPermission] Could not open app settings:", e);
  }
}
