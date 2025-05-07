import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBNk_tCac_F1nloyLjieaa_pSpaiFyi5qg",
  authDomain: "phi-sitca.firebaseapp.com",
  projectId: "phi-sitca",
  storageBucket: "phi-sitca.firebasestorage.app",
  messagingSenderId: "93963990041",
  appId: "1:93963990041:web:c1d305e05496535c3ea688"
};


// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
