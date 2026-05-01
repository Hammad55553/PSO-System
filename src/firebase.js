// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDlwJNwya8Eq0GBsIodCien0F9jytW5iMI",
    authDomain: "bilalvet-1bd2a.firebaseapp.com",
    projectId: "bilalvet-1bd2a",
    storageBucket: "bilalvet-1bd2a.firebasestorage.app",
    messagingSenderId: "168142885839",
    appId: "1:168142885839:web:db1319b1ea193798d1b8ba",
    measurementId: "G-60K32HNNJT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Analytics might fail in some environments, wrapping in check
let analytics;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Analytics not supported");
}

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);

// Enable Offline Persistence
import { enableIndexedDbPersistence } from "firebase/firestore";
if (typeof window !== "undefined") {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Persistence failed: Multiple tabs open");
        } else if (err.code === 'unimplemented') {
            console.warn("Persistence not supported by browser");
        }
    });
}

export const storage = getStorage(app);

export default app;
