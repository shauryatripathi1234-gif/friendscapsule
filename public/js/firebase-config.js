/**
 * THE TRIPATHI CAPSULE • FIREBASE CLOUD CONFIGURATION
 * 
 * To connect your Firebase project:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a free project (e.g. "friend-capsule")
 * 3. In the project dashboard, click the "</>" (Web) icon to register an app
 * 4. In "Build" > "Firestore Database", click "Create Database" -> Start in "Test mode"
 * 5. Paste your firebaseConfig values below:
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if user saved custom config in localStorage (for easy browser setup)
let savedConfig = null;
try {
  const localSaved = localStorage.getItem('fc_firebase_config');
  if (localSaved) {
    savedConfig = JSON.parse(localSaved);
  }
} catch (e) {
  // ignore
}

const activeFirebaseConfig = savedConfig || firebaseConfig;

let db = null;
let isFirebaseReady = false;

// Initialize Firebase if keys are configured
try {
  if (typeof firebase !== 'undefined' && activeFirebaseConfig.apiKey && activeFirebaseConfig.apiKey !== 'YOUR_API_KEY') {
    if (!firebase.apps.length) {
      firebase.initializeApp(activeFirebaseConfig);
    }
    db = firebase.firestore();
    isFirebaseReady = true;
    console.log('✨ Firebase Cloud Firestore connected successfully! All devices will sync memories live.');
  } else {
    console.log('ℹ️ Firebase not yet configured with your project keys. Memories will save locally until keys are added.');
  }
} catch (err) {
  console.warn('Firebase initialization notice:', err);
}
