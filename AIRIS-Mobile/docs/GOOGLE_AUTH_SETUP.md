# Google Authentication Setup for AIRIS Mobile

This document details how to configure, build, and test Google OAuth Authentication for the AIRIS Mobile application.

---

## 1. Firebase Authentication Console Setup

1. Open the [Firebase Console](https://console.firebase.google.com/) and navigate to your project.
2. Select **Authentication** in the left sidebar, then click on the **Sign-in method** tab.
3. Click **Add new provider** and select **Google**.
4. Enable the provider.
5. In the **Web SDK configuration** section under the Google provider settings, copy the **Web client ID**.
6. Set the copied client ID as the `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` environment variable inside your local `.env` file.

---

## 2. Google Cloud Platform (GCP) Console Setup

To support Android authentication, you must generate and register SHA keystore fingerprints:

### Generate SHA Keys (Development)

Run the following command in your terminal to retrieve your local Keystore fingerprints:

```bash
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android
```

Copy the **SHA-1** and **SHA-256** certificate fingerprints.

### Register Fingerprints in Firebase

1. Navigate to **Project Settings** in the Firebase Console.
2. Under the **General** tab, scroll down to the **Your apps** section and select the Android app (`com.airis.mobile`).
3. Click **Add fingerprint** and add both your development **SHA-1** and **SHA-256** fingerprints.
4. Download the updated `google-services.json` file and replace the existing one in the root of the `AIRIS-Mobile` project folder.

---

## 3. Local Environment Variables

Ensure your root `.env` file contains the correct Web Application Client ID (not the Android Client ID):

```text
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id-here.apps.googleusercontent.com
```

---

## 4. Native Development Testing Instructions

> [!WARNING]
> Google Sign-In relies on custom native modules (`@react-native-google-signin/google-signin`). As a result, it **cannot** be executed or tested in the standard Expo Go client app. You must build and run a native development client.

### Building and Running on Android Emulator or Device

1. Connect your Android device via USB (with debugging enabled) or open an Android Virtual Device (AVD).
2. Clean and prebuild the native project:
   ```bash
   npx expo prebuild --clean
   ```
3. Run the development build:
   ```bash
   npx expo run:android
   ```
4. Once the app starts in development mode, tap **Continue with Google** on the login screen to verify the integration.
