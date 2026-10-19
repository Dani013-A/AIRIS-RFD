import { Image } from "expo-image";
import React, { useSyncExternalStore } from "react";
import { View } from "react-native";
import {
  DEFAULT_PROFILE_FALLBACK,
  resolveProfilePhoto,
} from "../../services/firebase/profilePhotoService";

type PhotoSource = { uri?: string; defaultAsset?: any };

/** Bumped whenever the profile photo is replaced on this device. */
let photoVersion = 0;
const listeners = new Set<() => void>();

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

function getVersion() {
  return photoVersion;
}

export function notifyProfilePhotoChanged() {
  photoVersion += 1;
  listeners.forEach((notify) => notify());
}

const sourceCache = new Map<string, PhotoSource>();
const inFlight = new Set<string>();

function readPhotoSource(uid: string | null | undefined): PhotoSource {
  const fallback: PhotoSource = { defaultAsset: DEFAULT_PROFILE_FALLBACK };
  if (!uid) return fallback;
  const cached = sourceCache.get(uid);
  if (cached) return cached;
  if (!inFlight.has(uid)) {
    inFlight.add(uid);
    resolveProfilePhoto(uid).then((resolved) => {
      sourceCache.set(uid, resolved);
      inFlight.delete(uid);
      notifyProfilePhotoChanged();
    }).catch(() => {
      inFlight.delete(uid);
    });
  }
  return fallback;
}

interface UserAvatarProps {
  uid: string | null | undefined;
  size?: number;
  borderColor?: string;
}

/**
 * Single authoritative avatar renderer.
 * Source of truth is resolveProfilePhoto(uid) (device-local photo,
 * else bundled fallback). Refreshes live after photo changes without
 * an app restart; degrades gracefully to the fallback asset.
 */
export function UserAvatar({ uid, size = 56, borderColor = "#FFFFFF" }: UserAvatarProps) {
  // Re-render when the photo changes; resolution itself is cached.
  useSyncExternalStore(subscribe, getVersion);
  const source = readPhotoSource(uid);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Profile photo"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#79D5C8",
        borderWidth: 2,
        borderColor,
        overflow: "hidden",
      }}
    >
      <Image
        source={source.uri ? { uri: source.uri } : source.defaultAsset || DEFAULT_PROFILE_FALLBACK}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
      />
    </View>
  );
}
