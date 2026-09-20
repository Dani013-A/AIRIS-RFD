import { NativeModules, Platform } from "react-native";

const { AirisOrientation } = NativeModules;

/**
 * AirisOrientation
 *
 * Dedicated app-owned orientation and window controller for the Unity VR subsystem.
 * Interacts directly with the host Activity to manage:
 * - Activity orientation locking (Landscape for VR, Portrait for standard app screens)
 * - Android Window layout cutout mode (SHORT_EDGES to draw across the camera notch)
 * - Android Immersive Sticky mode (hiding system status and navigation bars)
 */
export const lockLandscape = (): void => {
  if (Platform.OS === "android" && AirisOrientation?.lockLandscape) {
    try {
      AirisOrientation.lockLandscape();
    } catch (e) {
      console.warn("[AirisOrientation] lockLandscape error:", e);
    }
  }
};

export const lockPortrait = (): void => {
  if (Platform.OS === "android" && AirisOrientation?.lockPortrait) {
    try {
      AirisOrientation.lockPortrait();
    } catch (e) {
      console.warn("[AirisOrientation] lockPortrait error:", e);
    }
  }
};

export default {
  lockLandscape,
  lockPortrait,
};
