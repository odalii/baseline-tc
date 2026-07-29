// ============================================================
// 🔥 FIREBASE CONFIGURATION — KARU TENNIS
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBklBeFi8vS0vf-1AYO2OkTvbq9aEhQ168",
  authDomain: "karu-tennis.firebaseapp.com",
  projectId: "karu-tennis",
  storageBucket: "karu-tennis.firebasestorage.app",
  messagingSenderId: "797989348882",
  appId: "1:797989348882:web:ce2c182b5a48a28afa1acb",
  measurementId: "G-CDP2JS5BGX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore Database
const db = firebase.firestore();

// Authentication
const auth = firebase.auth();

// Enable offline persistence
db.enablePersistence()
    .then(() => console.log('🔥 Firestore persistence enabled'))
    .catch((err) => console.warn('Persistence unavailable:', err.message));

// ============================================================
// 🛡️ ADMIN CHECK HELPER
// ============================================================
async function isAdmin() {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const doc = await db.collection('admins').doc('admin-list').get();
        if (doc.exists) {
            const data = doc.data();
            const adminIds = data.adminIds || [];
            return adminIds.includes(user.uid);
        }
        return false;
    } catch (error) {
        console.warn('Admin check failed:', error.message);
        return false;
    }
}

// ============================================================
// 📤 EXPOSE TO GLOBAL SCOPE
// ============================================================
window.db = db;
window.auth = auth;
window.isAdmin = isAdmin;

console.log('🔥 Firebase initialized successfully!');