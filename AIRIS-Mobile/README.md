# AIRIS Mobile Application

## Purpose
This directory contains the main frontend application used by students to upload resumes, take mock interviews, and view their career readiness metrics.

## Technology Stack
- React Native
- Expo
- Tailwind CSS (Nativewind)
- Firebase SDK

## Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

## Installation
Use the provided setup script or install dependencies manually:
```bash
./setup.sh
# or manually:
npm install
```

## Environment Configuration
The application requires environment variables to connect to Firebase and the backend API.

A `.env.example` file is provided in this directory. It contains safe placeholders for all the variables the application expects. Never place actual credentials in the `.env.example` file.

To configure your environment:
1. Copy `.env.example` to `.env`.
2. Open `.env` and replace the placeholder values with your real project keys.

### Required Environment Variables
- `EXPO_PUBLIC_API_URL`: The URL of the FastAPI backend.
- `EXPO_PUBLIC_FIREBASE_API_KEY`: Firebase API key.
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase Auth domain.
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID.
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket.
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID.
- `EXPO_PUBLIC_FIREBASE_APP_ID`: Firebase app ID.
- `EXPO_PUBLIC_MEASUREMENT_ID`: Firebase analytics measurement ID.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: Client ID for Google SSO.

## Local Development
To run the application locally on a simulator or physical device:
```bash
npx expo start
```
This starts the Expo bundler. You can press `i` to open the iOS simulator, `a` for Android, or scan the QR code with the Expo Go app.

## Web Development and Build
The application supports web output. This is particularly useful for remote testing.

To run the web version in development mode:
```bash
npx expo start -w
```

## Production Web Export
To generate a static web build that can be hosted on a standard web server (like Vercel or Netlify):
```bash
npx expo export -p web
```
This will create a `dist` directory containing HTML, CSS, and JS files. The `EXPO_PUBLIC_API_URL` variable is baked into this bundle at build time, meaning the static web app will route its requests directly to the configured backend.

EAS (Expo Application Services) is not required to build or host the web application.

## Backend API Configuration
By default, `EXPO_PUBLIC_API_URL` should point to `http://127.0.0.1:8000` for local development. When creating a web production build, update this variable to point to your live backend server before running the export command.

## Firebase Configuration
The app uses the standard Firebase JavaScript SDK. Ensure your Firestore security rules are deployed so the app can read and write data.

## Testing
Verify that you can log in, upload a resume, and complete an interview flow. If audio recording fails on the web, ensure you are testing over localhost or a secure HTTPS context, as browsers block microphone access on insecure connections.

## Troubleshooting
- **Network errors**: Check that the backend is running and `EXPO_PUBLIC_API_URL` is set correctly.
- **Microphone issues on web**: Ensure you are running on localhost or an HTTPS domain.
- **Missing Firebase config**: Ensure your `.env` file is named correctly and placed in the root of the `AIRIS-Mobile` directory.
