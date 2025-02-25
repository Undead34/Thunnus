import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvWNgfzyAhHi72c_sL-ZiI14asReyEP7o",
  authDomain: "violet-visual.firebaseapp.com",
  projectId: "violet-visual",
  storageBucket: "violet-visual.firebasestorage.app",
  messagingSenderId: "16379797973",
  appId: "1:16379797973:web:2c8e2393e1280f78ee1d5c",
  measurementId: "G-2SEJXV5QEL",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
