import { initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const USE_MOCK = import.meta.env.VITE_USE_EMULATOR === 'true'

function createFirebase() {
  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  return { auth: getAuth(app), db: getFirestore(app) }
}

// In mock mode, skip Firebase init entirely to avoid invalid-api-key crash
const firebase = USE_MOCK ? { auth: null, db: null } : createFirebase()

export const auth = firebase.auth as Auth
export const db = firebase.db as Firestore

export default firebase
