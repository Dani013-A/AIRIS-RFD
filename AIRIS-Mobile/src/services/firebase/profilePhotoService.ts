import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

export interface ProfilePhotoResult {
  success: boolean;
  photoURL?: string;
  message?: string;
}

/**
 * Bundled AIRIS static application fallback asset.
 * Used when no local profile photo exists or file cannot be read.
 */
export const DEFAULT_PROFILE_FALLBACK = require("../../../assets/images/airis-app-new.png");

/**
 * Centralized Profile Photo Resolver Strategy.
 * 1. Checks if account-isolated local profile photo exists on device filesystem.
 * 2. Returns local file URI if present and readable.
 * 3. Returns bundled AIRIS fallback asset if missing, corrupted, or on a new device.
 */
export async function resolveProfilePhoto(uid: string | null | undefined): Promise<{ uri?: string; defaultAsset?: any }> {
  if (!uid || typeof uid !== "string") {
    console.log(`[PROFILE][PHOTO_UPLOAD][FALLBACK] No user UID provided, returning default fallback asset.`);
    return { defaultAsset: DEFAULT_PROFILE_FALLBACK };
  }

  const userPhotoPath = `${FileSystem.documentDirectory}profile_photos/${uid}/profile.jpg`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(userPhotoPath);
    if (fileInfo.exists && !fileInfo.isDirectory && fileInfo.size && fileInfo.size > 0) {
      console.log(`[PROFILE][PHOTO_UPLOAD][RESOLVE] Found persistent local profile photo for UID ${uid}: ${userPhotoPath}`);
      const modTime = fileInfo.modificationTime || Date.now();
      return { uri: `${userPhotoPath}?t=${modTime}` };
    }
  } catch (err) {
    console.warn(`[PROFILE][PHOTO_UPLOAD][FALLBACK] Error reading local file system for ${uid}:`, err);
  }

  console.log(`[PROFILE][PHOTO_UPLOAD][FALLBACK] No local profile photo found for ${uid}, returning default fallback asset.`);
  return { defaultAsset: DEFAULT_PROFILE_FALLBACK };
}

/**
 * Account-Isolated Profile Photo Selection & Persistent Local Storage.
 * User selects photo -> validate -> copy into persistent AIRIS documentDirectory under profile_photos/{uid}/profile.jpg.
 * Firebase Storage is NOT called.
 */
export async function pickAndUploadProfilePhoto(uid: string): Promise<ProfilePhotoResult> {
  console.log(`[PROFILE][PHOTO_UPLOAD][START] Initiating local-first profile photo picker flow for UID: ${uid}`);

  if (!uid || typeof uid !== "string") {
    console.error(`[PROFILE][PHOTO_UPLOAD][ERROR] Invalid or missing user UID: ${uid}`);
    return {
      success: false,
      message: "You must be signed in to change your profile photo.",
    };
  }

  try {
    // 1. Request Media Library Permissions
    console.log(`[PROFILE][PHOTO_UPLOAD][PICK] Requesting media library permissions...`);
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      console.warn(`[PROFILE][PHOTO_UPLOAD][ERROR] Permission to access media library was denied.`);
      return {
        success: false,
        message: "Photo access is required to choose a profile picture.",
      };
    }

    // 2. Launch Image Picker
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      console.log(`[PROFILE][PHOTO_UPLOAD][PICK] Photo selection cancelled by user.`);
      return { success: false, message: "Photo selection cancelled." };
    }

    const asset = pickerResult.assets[0];
    const imageUri = asset.uri;

    if (!imageUri) {
      console.error(`[PROFILE][PHOTO_UPLOAD][VALIDATION] Picker returned asset without URI.`);
      return { success: false, message: "That image couldn't be used. Please choose another photo." };
    }

    console.log(`[PROFILE][PHOTO_UPLOAD][VALIDATION] Selected image: ${imageUri}. Checking file size...`);

    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists || (fileInfo.size && fileInfo.size > 5 * 1024 * 1024)) {
      console.warn(`[PROFILE][PHOTO_UPLOAD][VALIDATION] File size check failed or exceeds 5MB limit.`);
      return {
        success: false,
        message: "Selected image is too large. Please select a photo under 5MB.",
      };
    }

    // 3. Save to Account-Isolated Persistent Directory
    const userDir = `${FileSystem.documentDirectory}profile_photos/${uid}/`;
    const targetPath = `${userDir}profile.jpg`;

    console.log(`[PROFILE][PHOTO_UPLOAD][LOCAL_SAVE] Saving image to persistent local directory: ${targetPath}`);
    await FileSystem.makeDirectoryAsync(userDir, { intermediates: true });
    await FileSystem.copyAsync({ from: imageUri, to: targetPath });

    console.log(`[PROFILE][PHOTO_UPLOAD][LOCAL_SAVE_SUCCESS] Image saved successfully to device storage.`);

    // 4. Update Firestore & Auth metadata cleanly (storing null instead of device-specific file URIs)
    try {
      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, { photoURL: null });
      }
      const userDocRef = doc(db, "users", uid);
      await updateDoc(userDocRef, {
        photoURL: null,
        updatedAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn(`[PROFILE][PHOTO_UPLOAD][LOCAL_SAVE] Profile metadata update notice:`, dbErr);
    }

    console.log(`[PROFILE][PHOTO_UPLOAD][SUCCESS] Profile photo updated successfully for user ${uid}.`);
    return {
      success: true,
      photoURL: targetPath,
      message: "Profile photo updated successfully.",
    };
  } catch (err: unknown) {
    console.error(`[PROFILE][PHOTO_UPLOAD][ERROR] Local filesystem save failed:`, err);
    return {
      success: false,
      message: "We couldn't save your profile photo. Please try again.",
    };
  }
}

/**
 * Account Deletion Cleanup: Removes account-isolated local profile photo folder.
 */
export async function deleteLocalProfilePhoto(uid: string): Promise<void> {
  try {
    const userDir = `${FileSystem.documentDirectory}profile_photos/${uid}/`;
    console.log(`[PROFILE][PHOTO_UPLOAD][LOCAL_DELETE] Removing local profile directory for UID: ${uid}`);
    await FileSystem.deleteAsync(userDir, { idempotent: true });
  } catch (err) {
    console.warn(`[PROFILE][PHOTO_UPLOAD][LOCAL_DELETE] Failed to delete local photo directory for ${uid}:`, err);
  }
}
