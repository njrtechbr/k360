
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "controle-de-acesso-fp6pc",
  "appId": "1:537433313877:web:227d5cb3056bcbd13b3adc",
  "storageBucket": "controle-de-acesso-fp6pc.firebasestorage.app",
  "apiKey": "AIzaSyAta0SCL3hZcB_vJtAew2XZqU7SiE_bpUI",
  "authDomain": "controle-de-acesso-fp6pc.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "537433313877"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
