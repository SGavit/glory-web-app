import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAwozzp2hyJQwvohl1CogwouJwG_4UWjlI",
  authDomain: "glory-68505.firebaseapp.com",
  databaseURL: "https://glory-68505-default-rtdb.firebaseio.com",
  projectId: "glory-68505",
  storageBucket: "glory-68505.appspot.com",
  messagingSenderId: "482619268908",
  appId: "1:482619268908:web:3d5a80f5a2fe7982bcd689"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export default database;
