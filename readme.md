# 🎾 Baseline TC — Tennis Club Website

A fully functional tennis club website with Firebase backend.

## Features
- Public website with players, rankings, fixtures, news, and M-Pesa donations
- Admin panel for managing content (add/edit/delete players, fixtures, news, results)
- Role-based access control (Admin vs User)
- Cloud data storage via Firebase Firestore

## Setup Instructions

### 1. Create a Firebase Project
1. Go to [firebase.google.com](https://firebase.google.com)
2. Click "Create a project"
3. Name it `baseline-tc`

### 2. Enable Services
- **Firestore Database:** Create in test mode
- **Authentication:** Enable Email/Password

### 3. Get Your Firebase Config
1. In Firebase Console, click "Add web app"
2. Copy the config object
3. Replace the config in `public/firebase-config.js`

### 4. Deploy
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy