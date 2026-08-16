# AIRIS Admin Dashboard (Web)

## Purpose
This directory contains the administrative web dashboard for AIRIS. It allows educators and project managers to monitor student employability analytics, view resumes, and review interview performance metrics across the system.

## Technology Stack
- Next.js (React)
- Tailwind CSS
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
The application requires environment variables to connect to Firebase.

A `.env.example` file is provided.
1. Copy `.env.example` to `.env.local`.
2. Edit `.env.local` and replace the placeholders with your actual Firebase project keys.

## Firebase Configuration
This application uses the client-side Firebase SDK. It interacts with the same Firebase project as the mobile application. Ensure that your Firestore security rules (`firestore.rules` in the repository root) correctly enforce admin privileges so that unauthorized users cannot read aggregate student data.

## Backend Configuration
The dashboard primarily reads aggregated data from Firebase. Direct interactions with the AI backend API are minimal, as the heavy lifting is done during the student's mobile app session.

## Authentication
Authentication is handled via Firebase Auth. The dashboard restricts access based on custom claims or role documents stored in Firestore.

## Running Locally
To start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build and Testing
To create a production build and test it locally:
```bash
npm run build
npm run start
```

## Deployment Note
**AIRIS-Web is currently intended to remain local.** Unless there is an explicit requirement to deploy the admin dashboard publicly, you should run it locally on your machine to securely view analytics without exposing the admin interface to the internet.

## Troubleshooting
- **Permission Denied errors**: Verify that your Firestore security rules (`firestore.rules`) have been published to your Firebase Console and that your user account has the correct admin privileges.
- **Missing Firebase config**: Ensure your `.env.local` file is named correctly and located in the root of the `AIRIS-Web` directory.
