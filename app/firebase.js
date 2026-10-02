import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDfjq-t9295B_Rkr-PZxu2N4OALUxjUm8c",
  authDomain: "general-store-app-84667.firebaseapp.com",
  projectId: "general-store-app-84667",
  storageBucket: "general-store-app-84667.firebasestorage.app",
  messagingSenderId: "242791667350",
  appId: "1:242791667350:web:e998809ae3f15263d3d4b7",
  measurementId: "G-CEYJSDVHT4",
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export default app;